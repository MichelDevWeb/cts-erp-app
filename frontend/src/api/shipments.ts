import { supabase } from './supabaseClient'

// Placeholder for Phase 3 - Shipment API functions
export async function getShipments() {
  const { data, error } = await supabase
    .from('shipments')
    .select(`
      *,
      order:orders(id, order_number, customer:customers(id, name))
    `)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data
}

export async function getShipmentById(id: string) {
  const { data, error } = await supabase
    .from('shipments')
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

