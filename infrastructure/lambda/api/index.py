import json
import boto3
import uuid
import os
from datetime import datetime
from decimal import Decimal

dynamodb = boto3.resource('dynamodb')
classes_table = dynamodb.Table(os.environ['CLASSES_TABLE'])
bookings_table = dynamodb.Table(os.environ['BOOKINGS_TABLE'])
feedback_table = dynamodb.Table(os.environ['FEEDBACK_TABLE'])
ses_client = boto3.client('ses', region_name=os.environ.get('AWS_SES_REGION', 'us-east-1'))
ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', '')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', ADMIN_EMAIL)

def send_booking_notification(booking, class_info):
    if not ADMIN_EMAIL:
        return
    try:
        title = class_info.get('title', 'N/A')
        dt = class_info.get('dateTime', 'N/A')
        loc = class_info.get('location', 'N/A')
        avail = class_info.get('availableSeats', 0)
        total = class_info.get('totalSeats', 0)
        name = f"{booking['firstName']} {booking['lastName']}"

        subject = f"Nova rezervacija: {name} - {title}"
        body_text = (
            f"Nova rezervacija za tečaj!\n\n"
            f"TEČAJ: {title}\n"
            f"Datum: {dt}\n"
            f"Lokacija: {loc}\n"
            f"Preostalo mjesta: {avail - 1}/{total}\n\n"
            f"PODACI O POLAZNIKU:\n"
            f"Ime i prezime: {name}\n"
            f"Email: {booking['email']}\n"
            f"Telefon: {booking.get('phone', '-')}\n"
            f"Napomena: {booking.get('notes', '-')}\n\n"
            f"Booking ID: {booking['bookingId']}\n"
        )
        body_html = (
            f"<h2>Nova rezervacija za tečaj</h2>"
            f"<table style='border-collapse:collapse;'>"
            f"<tr><td style='padding:4px 12px;font-weight:bold;'>Tečaj:</td><td style='padding:4px 12px;'>{title}</td></tr>"
            f"<tr><td style='padding:4px 12px;font-weight:bold;'>Datum:</td><td style='padding:4px 12px;'>{dt}</td></tr>"
            f"<tr><td style='padding:4px 12px;font-weight:bold;'>Lokacija:</td><td style='padding:4px 12px;'>{loc}</td></tr>"
            f"<tr><td style='padding:4px 12px;font-weight:bold;'>Preostalo mjesta:</td><td style='padding:4px 12px;'>{avail - 1}/{total}</td></tr>"
            f"</table>"
            f"<hr style='margin:16px 0;'/>"
            f"<h3>Podaci o polazniku</h3>"
            f"<table style='border-collapse:collapse;'>"
            f"<tr><td style='padding:4px 12px;font-weight:bold;'>Ime i prezime:</td><td style='padding:4px 12px;'>{name}</td></tr>"
            f"<tr><td style='padding:4px 12px;font-weight:bold;'>Email:</td><td style='padding:4px 12px;'><a href='mailto:{booking['email']}'>{booking['email']}</a></td></tr>"
            f"<tr><td style='padding:4px 12px;font-weight:bold;'>Telefon:</td><td style='padding:4px 12px;'>{booking.get('phone', '-')}</td></tr>"
            f"<tr><td style='padding:4px 12px;font-weight:bold;'>Napomena:</td><td style='padding:4px 12px;'>{booking.get('notes', '-')}</td></tr>"
            f"</table>"
            f"<p style='color:#888;font-size:12px;margin-top:16px;'>Booking ID: {booking['bookingId']}</p>"
        )

        ses_client.send_email(
            Source=SENDER_EMAIL,
            Destination={'ToAddresses': [ADMIN_EMAIL]},
            Message={
                'Subject': {'Data': subject, 'Charset': 'UTF-8'},
                'Body': {
                    'Text': {'Data': body_text, 'Charset': 'UTF-8'},
                    'Html': {'Data': body_html, 'Charset': 'UTF-8'},
                }
            }
        )
    except Exception as e:
        print(f"Failed to send email notification: {e}")

def json_serial(obj):
    if isinstance(obj, Decimal):
        return int(obj) if obj == int(obj) else float(obj)
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError(f"Type {type(obj)} not serializable")

def resp(status_code, body):
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
        },
        'body': json.dumps(body, default=json_serial)
    }

def handler(event, context):
    method = event.get('httpMethod', '')
    path = event.get('resource', '')
    path_params = event.get('pathParameters') or {}

    if method == 'OPTIONS':
        return resp(200, {'message': 'OK'})

    try:
        # === PUBLIC ENDPOINTS ===

        # GET /classes - list available classes (public)
        if method == 'GET' and path == '/classes':
            result = classes_table.scan()
            items = result.get('Items', [])
            public_classes = []
            for c in items:
                public_classes.append({
                    'classId': c['classId'],
                    'title': c.get('title', ''),
                    'description': c.get('description', ''),
                    'instructor': c.get('instructor', ''),
                    'dateTime': c.get('dateTime', ''),
                    'duration': c.get('duration', ''),
                    'location': c.get('location', ''),
                    'totalSeats': c.get('totalSeats', 0),
                    'availableSeats': c.get('availableSeats', 0),
                    'dateHistory': c.get('dateHistory', []),
                })
            return resp(200, {'classes': public_classes})

        # GET /classes/{id} - single class detail (public)
        if method == 'GET' and path == '/classes/{id}':
            class_id = path_params.get('id')
            result = classes_table.get_item(Key={'classId': class_id})
            if 'Item' not in result:
                return resp(404, {'error': 'Class not found'})
            c = result['Item']
            return resp(200, {
                'classId': c['classId'],
                'title': c.get('title', ''),
                'description': c.get('description', ''),
                'instructor': c.get('instructor', ''),
                'dateTime': c.get('dateTime', ''),
                'duration': c.get('duration', ''),
                'location': c.get('location', ''),
                'totalSeats': c.get('totalSeats', 0),
                'availableSeats': c.get('availableSeats', 0),
            })

        # POST /classes/{id}/book - book a seat (public)
        if method == 'POST' and path == '/classes/{id}/book':
            class_id = path_params.get('id')
            body = json.loads(event.get('body', '{}'))

            required = ['firstName', 'lastName', 'email']
            missing = [f for f in required if not body.get(f)]
            if missing:
                return resp(400, {'error': f'Missing required fields: {missing}'})

            result = classes_table.get_item(Key={'classId': class_id})
            if 'Item' not in result:
                return resp(404, {'error': 'Class not found'})

            cls = result['Item']
            available = cls.get('availableSeats', 0)
            if available <= 0:
                return resp(409, {'error': 'No seats available'})

            now = datetime.utcnow().isoformat()
            booking = {
                'bookingId': str(uuid.uuid4()),
                'classId': class_id,
                'firstName': body['firstName'],
                'lastName': body['lastName'],
                'email': body['email'],
                'phone': body.get('phone', ''),
                'notes': body.get('notes', ''),
                'status': 'pending',
                'bookedAt': now,
            }

            try:
                classes_table.update_item(
                    Key={'classId': class_id},
                    UpdateExpression='SET availableSeats = availableSeats - :one, updatedAt = :now',
                    ConditionExpression='availableSeats > :zero',
                    ExpressionAttributeValues={
                        ':one': 1,
                        ':zero': 0,
                        ':now': now,
                    },
                )
            except dynamodb.meta.client.exceptions.ConditionalCheckFailedException:
                return resp(409, {'error': 'No seats available'})

            bookings_table.put_item(Item=booking)
            send_booking_notification(booking, cls)

            return resp(201, {
                'message': 'Booking confirmed',
                'bookingId': booking['bookingId'],
                'className': cls.get('title', ''),
            })

        # === ADMIN ENDPOINTS (protected by Cognito authorizer) ===

        # GET /admin/classes - list all classes with full details
        if method == 'GET' and path == '/admin/classes':
            result = classes_table.scan()
            return resp(200, {
                'classes': result.get('Items', []),
                'count': result.get('Count', 0)
            })

        # POST /admin/classes - create a class
        if method == 'POST' and path == '/admin/classes':
            body = json.loads(event.get('body', '{}'))
            required = ['title', 'totalSeats']
            missing = [f for f in required if f not in body]
            if missing:
                return resp(400, {'error': f'Missing: {missing}'})

            now = datetime.utcnow().isoformat()
            total = int(body['totalSeats'])
            item = {
                'classId': str(uuid.uuid4()),
                'title': body['title'],
                'description': body.get('description', ''),
                'instructor': body.get('instructor', ''),
                'dateTime': body.get('dateTime', ''),
                'duration': body.get('duration', ''),
                'location': body.get('location', ''),
                'totalSeats': total,
                'availableSeats': total,
                'createdAt': now,
                'updatedAt': now,
            }
            classes_table.put_item(Item=item)
            return resp(201, item)

        # GET /admin/classes/{id} - get class with bookings and feedback
        if method == 'GET' and path == '/admin/classes/{id}':
            class_id = path_params.get('id')
            result = classes_table.get_item(Key={'classId': class_id})
            if 'Item' not in result:
                return resp(404, {'error': 'Class not found'})

            bookings_result = bookings_table.query(
                IndexName='classId-index',
                KeyConditionExpression=boto3.dynamodb.conditions.Key('classId').eq(class_id)
            )

            feedback_result = feedback_table.query(
                IndexName='classId-index',
                KeyConditionExpression=boto3.dynamodb.conditions.Key('classId').eq(class_id)
            )

            cls = result['Item']
            cls['bookings'] = bookings_result.get('Items', [])
            cls['feedback'] = feedback_result.get('Items', [])
            return resp(200, cls)

        # PUT /admin/classes/{id} - update a class
        if method == 'PUT' and path == '/admin/classes/{id}':
            class_id = path_params.get('id')
            existing = classes_table.get_item(Key={'classId': class_id})
            if 'Item' not in existing:
                return resp(404, {'error': 'Class not found'})

            body = json.loads(event.get('body', '{}'))
            now = datetime.utcnow().isoformat()
            old = existing['Item']

            update_expr = 'SET updatedAt = :now'
            expr_vals = {':now': now}
            expr_names = {}

            for field in ['title', 'description', 'instructor', 'dateTime', 'duration', 'location']:
                if field in body:
                    attr_name = f'#{field}'
                    expr_names[attr_name] = field
                    update_expr += f', {attr_name} = :{field}'
                    expr_vals[f':{field}'] = body[field]

            if 'totalSeats' in body:
                new_total = int(body['totalSeats'])
                old_total = old.get('totalSeats', 0)
                old_available = old.get('availableSeats', 0)
                new_available = old_available + (new_total - old_total)
                if new_available < 0:
                    return resp(400, {'error': 'Cannot reduce seats below number of bookings'})
                update_expr += ', totalSeats = :totalSeats, availableSeats = :availableSeats'
                expr_vals[':totalSeats'] = new_total
                expr_vals[':availableSeats'] = new_available

            update_kwargs = {
                'Key': {'classId': class_id},
                'UpdateExpression': update_expr,
                'ExpressionAttributeValues': expr_vals,
                'ReturnValues': 'ALL_NEW',
            }
            if expr_names:
                update_kwargs['ExpressionAttributeNames'] = expr_names

            result = classes_table.update_item(**update_kwargs)

            # If class date changed to future (reactivation), clear bookings,
            # save old date to history, reset seats and feedback_sent
            if 'dateTime' in body:
                old_dt = old.get('dateTime', '')
                new_dt = body['dateTime']
                old_was_past = old_dt and old_dt < now
                new_is_future = new_dt and new_dt > now
                if old_was_past and new_is_future:
                    # Save old date to history
                    date_history = list(old.get('dateHistory', []))
                    date_history.append(old_dt)
                    classes_table.update_item(
                        Key={'classId': class_id},
                        UpdateExpression='SET dateHistory = :dh, availableSeats = totalSeats REMOVE feedback_sent, feedbackSentAt',
                        ExpressionAttributeValues={':dh': date_history},
                    )
                    # Delete all bookings for this class
                    bookings_result = bookings_table.query(
                        IndexName='classId-index',
                        KeyConditionExpression=boto3.dynamodb.conditions.Key('classId').eq(class_id)
                    )
                    for b in bookings_result.get('Items', []):
                        bookings_table.delete_item(Key={'bookingId': b['bookingId']})

            return resp(200, result['Attributes'])

        # DELETE /admin/classes/{id} - delete a class and its bookings and feedback
        if method == 'DELETE' and path == '/admin/classes/{id}':
            class_id = path_params.get('id')
            existing = classes_table.get_item(Key={'classId': class_id})
            if 'Item' not in existing:
                return resp(404, {'error': 'Class not found'})

            bookings_result = bookings_table.query(
                IndexName='classId-index',
                KeyConditionExpression=boto3.dynamodb.conditions.Key('classId').eq(class_id)
            )
            for b in bookings_result.get('Items', []):
                bookings_table.delete_item(Key={'bookingId': b['bookingId']})

            feedback_result = feedback_table.query(
                IndexName='classId-index',
                KeyConditionExpression=boto3.dynamodb.conditions.Key('classId').eq(class_id)
            )
            for fb in feedback_result.get('Items', []):
                feedback_table.delete_item(Key={'bookingId': fb['bookingId']})

            classes_table.delete_item(Key={'classId': class_id})
            return resp(200, {'message': 'Deleted'})

        # PUT /admin/bookings/{id} - confirm or deny a booking
        if method == 'PUT' and path == '/admin/bookings/{id}':
            booking_id = path_params.get('id')
            result = bookings_table.get_item(Key={'bookingId': booking_id})
            if 'Item' not in result:
                return resp(404, {'error': 'Booking not found'})

            body = json.loads(event.get('body', '{}'))
            new_status = body.get('status')
            if new_status not in ('confirmed', 'denied'):
                return resp(400, {'error': 'Status must be confirmed or denied'})

            booking = result['Item']
            old_status = booking.get('status', 'pending')
            now = datetime.utcnow().isoformat()

            if new_status == 'denied' and old_status != 'denied':
                classes_table.update_item(
                    Key={'classId': booking['classId']},
                    UpdateExpression='SET availableSeats = availableSeats + :one, updatedAt = :now',
                    ExpressionAttributeValues={':one': 1, ':now': now},
                )
            elif new_status != 'denied' and old_status == 'denied':
                try:
                    classes_table.update_item(
                        Key={'classId': booking['classId']},
                        UpdateExpression='SET availableSeats = availableSeats - :one, updatedAt = :now',
                        ConditionExpression='availableSeats > :zero',
                        ExpressionAttributeValues={':one': 1, ':zero': 0, ':now': now},
                    )
                except dynamodb.meta.client.exceptions.ConditionalCheckFailedException:
                    return resp(409, {'error': 'Nema slobodnih mjesta za ponovnu potvrdu'})

            bookings_table.update_item(
                Key={'bookingId': booking_id},
                UpdateExpression='SET #s = :status, updatedAt = :now',
                ExpressionAttributeNames={'#s': 'status'},
                ExpressionAttributeValues={':status': new_status, ':now': now},
            )

            # Generate feedbackToken when booking is confirmed
            if new_status == 'confirmed' and 'feedbackToken' not in booking:
                feedback_token = str(uuid.uuid4())
                bookings_table.update_item(
                    Key={'bookingId': booking_id},
                    UpdateExpression='SET feedbackToken = :token',
                    ExpressionAttributeValues={':token': feedback_token},
                )

            return resp(200, {'message': f'Booking {new_status}', 'status': new_status})

        # DELETE /admin/bookings/{id} - cancel a single booking
        if method == 'DELETE' and path == '/admin/bookings/{id}':
            booking_id = path_params.get('id')
            result = bookings_table.get_item(Key={'bookingId': booking_id})
            if 'Item' not in result:
                return resp(404, {'error': 'Booking not found'})

            booking = result['Item']
            now = datetime.utcnow().isoformat()

            classes_table.update_item(
                Key={'classId': booking['classId']},
                UpdateExpression='SET availableSeats = availableSeats + :one, updatedAt = :now',
                ExpressionAttributeValues={':one': 1, ':now': now},
            )

            bookings_table.delete_item(Key={'bookingId': booking_id})
            return resp(200, {'message': 'Booking cancelled'})

        # === FEEDBACK ENDPOINTS ===

        # GET /feedback/{token} - validate token and return class info
        if method == 'GET' and path == '/feedback/{token}':
            token = path_params.get('token')
            scan_result = bookings_table.scan(
                FilterExpression=boto3.dynamodb.conditions.Attr('feedbackToken').eq(token)
            )
            items = scan_result.get('Items', [])
            if not items:
                return resp(404, {'error': 'Invalid feedback token'})
            booking = items[0]
            class_result = classes_table.get_item(Key={'classId': booking['classId']})
            class_info = class_result.get('Item', {})
            feedback_result = feedback_table.get_item(Key={'bookingId': booking['bookingId']})
            already_submitted = 'Item' in feedback_result
            response_body = {
                'classTitle': class_info.get('title', ''),
                'classDate': class_info.get('dateTime', ''),
                'alreadySubmitted': already_submitted,
            }
            if already_submitted:
                fb = feedback_result['Item']
                response_body['score'] = fb.get('score')
                response_body['comment'] = fb.get('comment', '')
            return resp(200, response_body)

        # POST /feedback/{token} - submit feedback
        if method == 'POST' and path == '/feedback/{token}':
            token = path_params.get('token')
            body = json.loads(event.get('body', '{}'))
            score = body.get('score')
            comment = body.get('comment')
            if not isinstance(score, int) or score < 1 or score > 5:
                return resp(400, {'error': 'Invalid score or comment'})
            if not isinstance(comment, str) or len(comment) == 0 or len(comment) > 1000:
                return resp(400, {'error': 'Invalid score or comment'})
            scan_result = bookings_table.scan(
                FilterExpression=boto3.dynamodb.conditions.Attr('feedbackToken').eq(token)
            )
            items = scan_result.get('Items', [])
            if not items:
                return resp(404, {'error': 'Invalid feedback token'})
            booking = items[0]
            existing_feedback = feedback_table.get_item(Key={'bookingId': booking['bookingId']})
            if 'Item' in existing_feedback:
                return resp(409, {'error': 'Feedback already submitted for this token'})
            now = datetime.utcnow().isoformat()
            attendee_name = f"{booking.get('firstName', '')} {booking.get('lastName', '')}".strip()
            feedback_table.put_item(Item={
                'bookingId': booking['bookingId'],
                'classId': booking['classId'],
                'feedbackToken': token,
                'score': score,
                'comment': comment,
                'status': 'pending',
                'attendeeName': attendee_name,
                'submittedAt': now,
            })
            return resp(201, {'message': 'Feedback submitted successfully'})

        # GET /classes/{id}/reviews - public approved reviews
        if method == 'GET' and path == '/classes/{id}/reviews':
            class_id = path_params.get('id')
            query_result = feedback_table.query(
                IndexName='classId-index',
                KeyConditionExpression=boto3.dynamodb.conditions.Key('classId').eq(class_id),
                FilterExpression=boto3.dynamodb.conditions.Attr('status').eq('approved')
            )
            approved = query_result.get('Items', [])
            approved.sort(key=lambda x: x.get('submittedAt', ''), reverse=True)
            reviews = []
            for fb in approved:
                reviews.append({
                    'score': fb.get('score'),
                    'comment': fb.get('comment', ''),
                    'submittedAt': fb.get('submittedAt', ''),
                })
            total_reviews = len(approved)
            avg_score = 0
            if total_reviews > 0:
                avg_score = round(sum(fb.get('score', 0) for fb in approved) / total_reviews, 1)
            return resp(200, {
                'reviews': reviews,
                'averageScore': avg_score,
                'totalReviews': total_reviews,
            })

        # PUT /admin/feedback/{id} - approve or reject feedback
        if method == 'PUT' and path == '/admin/feedback/{id}':
            feedback_id = path_params.get('id')
            body = json.loads(event.get('body', '{}'))
            new_status = body.get('status')
            if new_status not in ('approved', 'rejected'):
                return resp(400, {'error': 'Status must be approved or rejected'})
            result = feedback_table.get_item(Key={'bookingId': feedback_id})
            if 'Item' not in result:
                return resp(404, {'error': 'Feedback not found'})
            now = datetime.utcnow().isoformat()
            feedback_table.update_item(
                Key={'bookingId': feedback_id},
                UpdateExpression='SET #s = :status, updatedAt = :now',
                ExpressionAttributeNames={'#s': 'status'},
                ExpressionAttributeValues={':status': new_status, ':now': now},
            )
            return resp(200, {'message': 'Feedback status updated', 'status': new_status})

        return resp(405, {'error': 'Method not allowed'})

    except Exception as e:
        print(f"Error: {e}")
        return resp(500, {'error': 'Internal server error'})
