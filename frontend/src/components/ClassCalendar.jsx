import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'

const DAYS_HR = ['Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub', 'Ned']
const MONTHS_HR = [
  'Siječanj', 'Veljača', 'Ožujak', 'Travanj', 'Svibanj', 'Lipanj',
  'Srpanj', 'Kolovoz', 'Rujan', 'Listopad', 'Studeni', 'Prosinac'
]

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year, month) {
  const day = new Date(year, month, 1).getDay()
  // Convert Sunday=0 to Monday-based (Mon=0, Sun=6)
  return day === 0 ? 6 : day - 1
}

function isPastClass(cls) {
  if (!cls.dateTime) return false
  return new Date(cls.dateTime) < new Date()
}

export default function ClassCalendar({ classes }) {
  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [selectedDate, setSelectedDate] = useState(null)

  // Group classes by date string (YYYY-MM-DD)
  const classesByDate = useMemo(() => {
    const map = {}
    classes.forEach((cls) => {
      if (!cls.dateTime) return
      const d = new Date(cls.dateTime)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      if (!map[key]) map[key] = []
      map[key].push(cls)
    })
    return map
  }, [classes])

  const daysInMonth = getDaysInMonth(currentYear, currentMonth)
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth)

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
    setSelectedDate(null)
  }

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
    setSelectedDate(null)
  }

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('hr-HR', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const isToday = (day) => {
    return (
      day === today.getDate() &&
      currentMonth === today.getMonth() &&
      currentYear === today.getFullYear()
    )
  }

  const dateKey = (day) =>
    `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

  const selectedClasses = selectedDate ? classesByDate[selectedDate] || [] : []

  return (
    <div className="card">
      <h2 className="text-lg font-bold text-dark-800 mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        Kalendar tečajeva
      </h2>

      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          className="p-2 rounded-lg hover:bg-dark-100 transition-colors text-dark-600"
          aria-label="Prethodni mjesec"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-dark-800 font-semibold">
          {MONTHS_HR[currentMonth]} {currentYear}
        </span>
        <button
          onClick={nextMonth}
          className="p-2 rounded-lg hover:bg-dark-100 transition-colors text-dark-600"
          aria-label="Sljedeći mjesec"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS_HR.map((day) => (
          <div key={day} className="text-center text-xs font-semibold text-dark-400 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {/* Empty cells before first day */}
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} className="p-1 min-h-[4.5rem]" />
        ))}

        {/* Day cells */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1
          const key = dateKey(day)
          const hasClasses = !!classesByDate[key]
          const isSelected = selectedDate === key
          const todayClass = isToday(day)
          const dayClasses = classesByDate[key] || []

          return (
            <button
              key={day}
              onClick={() => hasClasses && setSelectedDate(isSelected ? null : key)}
              className={`p-1 min-h-[4.5rem] flex flex-col items-center rounded-lg text-sm transition-all
                ${hasClasses ? 'cursor-pointer hover:bg-primary-50' : 'cursor-default text-dark-400'}
                ${isSelected ? 'bg-primary-100 ring-2 ring-primary-500' : ''}
                ${todayClass && !isSelected ? 'bg-dark-100' : ''}
              `}
              disabled={!hasClasses}
              aria-label={`${day}. ${MONTHS_HR[currentMonth]}${hasClasses ? ` - ${dayClasses.length} tečaj(eva)` : ''}`}
            >
              <span className={`${todayClass ? 'text-primary-500 font-bold' : ''} ${hasClasses ? 'font-semibold' : ''}`}>{day}</span>
              {hasClasses && (
                <div className="w-full mt-0.5 space-y-0.5 px-0.5">
                  {dayClasses.slice(0, 2).map((cls, idx) => {
                    const past = isPastClass(cls)
                    return (
                      <div
                        key={idx}
                        className={`text-[0.6rem] leading-tight truncate rounded px-1 py-0.5 ${past ? 'bg-dark-100 text-dark-400' : cls.availableSeats <= 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}
                      >
                        {cls.title}
                      </div>
                    )
                  })}
                  {dayClasses.length > 2 && (
                    <div className="text-[0.55rem] text-dark-400 text-center">+{dayClasses.length - 2} više</div>
                  )}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Selected date details */}
      {selectedDate && selectedClasses.length > 0 && (
        <div className="mt-4 border-t border-dark-100 pt-4 space-y-3">
          <h3 className="text-sm font-semibold text-dark-600">
            {new Date(selectedDate + 'T00:00:00').toLocaleDateString('hr-HR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </h3>
          {selectedClasses.map((cls) => {
            const isFull = cls.availableSeats <= 0
            const past = isPastClass(cls)
            return (
              <div
                key={cls.classId}
                className={`flex items-center justify-between p-3 rounded-lg border border-dark-100 ${past ? 'bg-dark-100 opacity-70' : 'bg-dark-50'}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold text-sm truncate ${past ? 'text-dark-400' : 'text-dark-800'}`}>{cls.title}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${past ? 'bg-dark-200 text-dark-400' : isFull ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
                      {past ? 'Završeno' : isFull ? 'Popunjeno' : `${cls.availableSeats}/${cls.totalSeats}`}
                    </span>
                  </div>
                  <div className="text-xs text-dark-500 mt-1 flex items-center gap-3">
                    {cls.dateTime && <span>{formatTime(cls.dateTime)}</span>}
                    {cls.location && <span>📍 {cls.location}</span>}
                    {cls.instructor && <span>👤 {cls.instructor}</span>}
                  </div>
                </div>
                {!past && !isFull && (
                  <Link
                    to={`/book/${cls.classId}`}
                    className="ml-3 text-xs bg-primary-500 text-white px-3 py-1.5 rounded-full hover:bg-primary-600 transition-colors whitespace-nowrap"
                  >
                    Rezerviraj
                  </Link>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
