import { supabase } from './supabaseClient'

// Placeholder for Phase 2 - Invoice API functions
export async function getInvoices() {
  const { data, error } = await supabase
    .from('invoices')
    .select(`
      *,
      order:orders(id, order_number, customer:customers(id, name))
    `)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data
}

export async function getInvoiceById(id: string) {
  const { data, error } = await supabase
    .from('invoices')
    .select(`
      *,
      order:orders(
        id,
        order_number,
        customer:customers(id, name, email, phone, address)
      )
    `)
    .eq('id', id)
    .single()
  
  if (error) throw error
  return data
}

