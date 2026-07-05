import {
  startOfDay,
  endOfDay,
  startOfWeek,
  startOfMonth,
  endOfMonth,
  setDate,
  getDaysInMonth,
  format,
} from 'date-fns'
import { es } from 'date-fns/locale'

export interface RangoPeriodo {
  desde: string
  hasta: string
}

const fmt = (date: Date) => format(date, 'yyyy-MM-dd')

export function calcularPeriodo(
  atajo: string,
  custom?: { desde: string; hasta: string }
): RangoPeriodo {
  const hoy = new Date()

  switch (atajo) {
    case 'hoy':
      return { desde: fmt(startOfDay(hoy)), hasta: fmt(endOfDay(hoy)) }

    case 'esta_semana':
      return {
        desde: fmt(startOfWeek(hoy, { weekStartsOn: 1, locale: es })),
        hasta: fmt(hoy),
      }

    case 'esta_quincena': {
      const dia = hoy.getDate()
      if (dia <= 15) {
        return { desde: fmt(setDate(hoy, 1)), hasta: fmt(setDate(hoy, 15)) }
      }
      return {
        desde: fmt(setDate(hoy, 16)),
        hasta: fmt(setDate(hoy, getDaysInMonth(hoy))),
      }
    }

    case 'este_mes':
      return { desde: fmt(startOfMonth(hoy)), hasta: fmt(endOfMonth(hoy)) }

    case 'personalizado':
      return custom ?? { desde: fmt(startOfDay(hoy)), hasta: fmt(hoy) }

    default:
      return { desde: fmt(startOfDay(hoy)), hasta: fmt(hoy) }
  }
}
