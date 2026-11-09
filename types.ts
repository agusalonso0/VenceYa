export type Category = 'Servicios' | 'Vivienda' | 'Tarjetas' | 'Impuestos' | 'Seguros' | 'Suscripciones' | 'Otros'
export type Bill = {
  id: string
  user_id: string
  title: string
  amount: number
  due_date: string
  category: Category
  notes: string | null
  paid: boolean
  paid_at: string | null
  created_at: string
}