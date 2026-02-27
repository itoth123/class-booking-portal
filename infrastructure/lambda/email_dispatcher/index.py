import json
import os
import boto3
from datetime import datetime, timezone
from boto3.dynamodb.conditions import Key, Attr

dynamodb = boto3.resource('dynamodb')
classes_table = dynamodb.Table(os.environ['CLASSES_TABLE'])
bookings_table = dynamodb.Table(os.environ['BOOKINGS_TABLE'])
ses_client = boto3.client('ses', region_name=os.environ.get('AWS_SES_REGION', 'us-east-1'))

SENDER_EMAIL = os.environ['SENDER_EMAIL']
SITE_DOMAIN = os.environ['SITE_DOMAIN']

def get_eligible_classes():
    now_iso = datetime.now(timezone.utc).isoformat()
    response = classes_table.scan(
        FilterExpression=Attr('dateTime').lt(now_iso) & (
            Attr('feedback_sent').not_exists() | Attr('feedback_sent').ne(True)
        )
    )
    classes = response.get('Items', [])
    while 'LastEvaluatedKey' in response:
        response = classes_table.scan(
            FilterExpression=Attr('dateTime').lt(now_iso) & (
                Attr('feedback_sent').not_exists() | Attr('feedback_sent').ne(True)
            ),
            ExclusiveStartKey=response['LastEvaluatedKey']
        )
        classes.extend(response.get('Items', []))
    return classes

def get_confirmed_bookings(class_id):
    response = bookings_table.query(
        IndexName='classId-index',
        KeyConditionExpression=Key('classId').eq(class_id),
        FilterExpression=Attr('status').eq('confirmed') & Attr('feedbackToken').exists()
    )
    bookings = response.get('Items', [])
    while 'LastEvaluatedKey' in response:
        response = bookings_table.query(
            IndexName='classId-index',
            KeyConditionExpression=Key('classId').eq(class_id),
            FilterExpression=Attr('status').eq('confirmed') & Attr('feedbackToken').exists(),
            ExclusiveStartKey=response['LastEvaluatedKey']
        )
        bookings.extend(response.get('Items', []))
    return bookings

def format_date(date_str):
    try:
        dt = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
        return dt.strftime('%d.%m.%Y. u %H:%M')
    except Exception:
        return date_str

def compose_email(class_title, class_date, feedback_token):
    feedback_link = f"https://{SITE_DOMAIN}/feedback/{feedback_token}"
    formatted_date = format_date(class_date)
    subject = f"Vaše mišljenje o tečaju: {class_title}"
    body_text = (
        f"Poštovani,\n\n"
        f"Hvala Vam što ste prisustvovali tečaju \"{class_title}\" "
        f"održanom {formatted_date}.\n\n"
        f"Voljeli bismo čuti Vaše mišljenje! Molimo Vas da odvojite "
        f"trenutak i ostavite svoju recenziju putem sljedeće poveznice:\n\n"
        f"{feedback_link}\n\n"
        f"Vaše povratne informacije pomažu nam poboljšati naše tečajeve.\n\n"
        f"Srdačan pozdrav,\nDose of Today"
    )
    body_html = (
        f"<html><body style='font-family:Arial,sans-serif;color:#333;'>"
        f"<h2 style='color:#2c3e50;'>Vaše mišljenje nam je važno!</h2>"
        f"<p>Poštovani,</p>"
        f"<p>Hvala Vam što ste prisustvovali tečaju "
        f"<strong>{class_title}</strong> održanom "
        f"<strong>{formatted_date}</strong>.</p>"
        f"<p>Voljeli bismo čuti Vaše mišljenje! Molimo Vas da odvojite "
        f"trenutak i ostavite svoju recenziju.</p>"
        f"<p style='margin:24px 0;'>"
        f"<a href='{feedback_link}' style='background-color:#3498db;"
        f"color:#fff;padding:12px 24px;text-decoration:none;"
        f"border-radius:4px;font-size:16px;'>Ostavite recenziju</a></p>"
        f"<p>Ili kopirajte ovu poveznicu u preglednik:<br/>"
        f"<a href='{feedback_link}'>{feedback_link}</a></p>"
        f"<p>Vaše povratne informacije pomažu nam poboljšati naše tečajeve.</p>"
        f"<p>Srdačan pozdrav,<br/><strong>Dose of Today</strong></p>"
        f"</body></html>"
    )
    return subject, body_text, body_html

def send_feedback_email(recipient_email, subject, body_text, body_html):
    ses_client.send_email(
        Source=SENDER_EMAIL,
        Destination={'ToAddresses': [recipient_email]},
        Message={
            'Subject': {'Data': subject, 'Charset': 'UTF-8'},
            'Body': {
                'Text': {'Data': body_text, 'Charset': 'UTF-8'},
                'Html': {'Data': body_html, 'Charset': 'UTF-8'}
            }
        }
    )

def mark_class_feedback_sent(class_id):
    classes_table.update_item(
        Key={'classId': class_id},
        UpdateExpression='SET feedback_sent = :sent, feedbackSentAt = :ts',
        ExpressionAttributeValues={
            ':sent': True,
            ':ts': datetime.now(timezone.utc).isoformat()
        }
    )

def handler(event, context):
    print("Email dispatcher invoked")
    eligible_classes = get_eligible_classes()
    print(f"Found {len(eligible_classes)} eligible classes")

    results = {'processed': 0, 'emails_sent': 0, 'errors': []}

    for cls in eligible_classes:
        class_id = cls.get('classId')
        class_title = cls.get('title', 'Tečaj')
        class_date = cls.get('dateTime', '')
        print(f"Processing class: {class_id} - {class_title}")

        bookings = get_confirmed_bookings(class_id)
        print(f"  Found {len(bookings)} confirmed bookings with tokens")

        if not bookings:
            mark_class_feedback_sent(class_id)
            results['processed'] += 1
            continue

        all_sent = True
        for booking in bookings:
            booking_id = booking.get('bookingId', 'unknown')
            email = booking.get('email', '')
            token = booking.get('feedbackToken', '')

            if not email or not token:
                print(f"  Skipping booking {booking_id}: missing email or token")
                continue

            try:
                subject, body_text, body_html = compose_email(
                    class_title, class_date, token
                )
                send_feedback_email(email, subject, body_text, body_html)
                results['emails_sent'] += 1
                print(f"  Sent email to {email} for booking {booking_id}")
            except Exception as e:
                all_sent = False
                error_msg = f"Failed to send email to {email} for booking {booking_id}: {str(e)}"
                print(f"  ERROR: {error_msg}")
                results['errors'].append(error_msg)

        if all_sent:
            mark_class_feedback_sent(class_id)
            print(f"  Marked class {class_id} as feedback_sent")
        else:
            print(f"  NOT marking class {class_id} - some emails failed")

        results['processed'] += 1

    print(f"Dispatch complete: {json.dumps(results)}")
    return {
        'statusCode': 200,
        'body': json.dumps(results)
    }
