'use client';

import { createContext, useContext, type ComponentProps, type Ref } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { DayButton } from 'react-day-picker';

const Counts = createContext<Record<string, number>>({});
function CalendarRoot({ rootRef, ...props }: ComponentProps<'div'> & { rootRef?: Ref<HTMLDivElement> }) {
  return <div {...props} ref={rootRef} data-slot="calendar" />;
}
export const dayKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export const localDate = (key: string) => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d, 12); };

function BookingDay(props: ComponentProps<typeof DayButton>) {
  const counts = useContext(Counts);
  const count = counts[dayKey(props.day.date)] ?? 0;
  return <DayButton {...props} data-day={dayKey(props.day.date)} data-selected-single={!!props.modifiers.selected} aria-label={`${props.day.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}, ${count} ${count === 1 ? 'booking' : 'bookings'}`}>
    {props.children}{count > 0 && <span className="cp-date-count" aria-hidden="true">{count}</span>}
  </DayButton>;
}

export default function BookingCalendar({ starts, selected, month, onSelect, onMonth }: {
  starts: string[]; selected: string; month: string;
  onSelect: (day: string) => void; onMonth: (day: string) => void;
}) {
  const counts = starts.reduce<Record<string, number>>((all, start) => { const key = start.slice(0, 10); all[key] = (all[key] ?? 0) + 1; return all; }, {});
  return <section className="cp-booking-calendar" aria-label="Booking calendar">
    <Counts.Provider value={counts}><Calendar mode="single" required weekStartsOn={1} showOutsideDays={false}
      selected={localDate(selected)} month={localDate(month)} onSelect={date => onSelect(dayKey(date))}
      onMonthChange={date => onMonth(dayKey(date))} components={{ Root: CalendarRoot, DayButton: BookingDay }}
      formatters={{ formatWeekdayName: date => date.toLocaleDateString('en-GB', { weekday: 'short' }).slice(0, 1) }}
    /></Counts.Provider>
  </section>;
}
