import { supabase } from './supabaseClient'

// Placeholder for Phase 1 - Order API functions
export async function getOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      customer:customers(id, name)
    `)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data
}

export async function getOrderById(id: string) {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      customer:customers(id, name, email, phone, address),
      order_items(
        id,
        quantity,
        unit_price,
        line_total,
        product:products(id, sku, name, unit)
      )
    `)
    .eq('id', id)
    .single()
  
  if (error) throw error
  return data
}

