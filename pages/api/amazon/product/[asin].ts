import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Initialize Supabase client
const SUPABASE_URL = process.env.SUPABASE_URL || 'your-supabase-url-placeholder'; // Placeholder
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'your-supabase-service-key-placeholder'; // Placeholder
const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Environment variable for API key
const MERCHBOT_API_KEY = process.env.MERCHBOT_API_KEY || 'your-merchbot-api-key-placeholder'; // Placeholder for testing

// Assuming Product interface is defined similarly to bestsellers.ts
// For brevity, we'll assume it's available or define a minimal one.
interface Product {
  id: number;
  asin: string;
  title: string;
  price?: number | null;
  currency?: string | null;
  bsr?: number | null;
  rating?: number | null;
  reviews_count?: number | null;
  image_url?: string | null;
  product_url?: string | null;
  category?: string | null;
  date_first_available?: string | null; 
  is_prime?: boolean | null;
  is_fba?: boolean | null;
  sales_volume_text?: string | null;
  delivery_info_text?: string | null;
  data_source_api?: string | null;
  fetched_at: string;
  created_at: string;
}

interface SuccessResponse {
  success: true;
  data: Product;
}

interface ErrorResponse {
  success: false;
  message: string;
  details?: any;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  // --- API Key Authentication ---
  const apiKey = req.headers['x-api-key'];
  if (!MERCHBOT_API_KEY || apiKey !== MERCHBOT_API_KEY) {
    return res.status(401).json({ success: false, message: 'Unauthorized: Invalid or missing API Key' });
  }

  const { asin } = req.query; // Next.js dynamic routes populate req.query with path parameters

  if (!asin || typeof asin !== 'string') {
    return res.status(400).json({ success: false, message: 'ASIN path parameter is required and must be a string.' });
  }

  try {
    const { data: product, error } = await supabase
      .from('amazon_products')
      .select('*')
      .eq('asin', asin)
      .single(); // .single() expects at most one row

    if (error) {
      // PGRST116: "Searched item was not found" - Supabase/PostgREST error code for no rows when .single() is used
      if (error.code === 'PGRST116') {
        return res.status(404).json({ success: false, message: `Product with ASIN ${asin} not found.` });
      }
      // For other errors
      console.error('Supabase query error:', error);
      return res.status(500).json({ success: false, message: 'Error fetching product details from database.', details: error.message });
    }

    // If data is null and no error (other than PGRST116, handled above), it means not found.
    // This check is somewhat redundant if PGRST116 is caught, but good for robustness.
    if (!product) {
      return res.status(404).json({ success: false, message: `Product with ASIN ${asin} not found.` });
    }

    res.status(200).json({ success: true, data: product as Product });

  } catch (e: any) {
    console.error(`Server error in /api/amazon/product/${asin}:`, e);
    res.status(500).json({ success: false, message: 'An unexpected server error occurred.', details: e.message });
  }
}
```
