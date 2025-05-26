import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Initialize Supabase client
const SUPABASE_URL = process.env.SUPABASE_URL || 'your-supabase-url-placeholder'; // Placeholder
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'your-supabase-service-key-placeholder'; // Placeholder
const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Environment variable for API key
const MERCHBOT_API_KEY = process.env.MERCHBOT_API_KEY || 'your-merchbot-api-key-placeholder'; // Placeholder for testing

interface SuccessResponse {
  success: true;
  data: {
    categories: string[];
  };
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

  try {
    // To get distinct categories, it's often best to create a view or a stored procedure in PostgreSQL/Supabase
    // if the JS client library doesn't directly support SELECT DISTINCT on a single column easily
    // and you want to avoid pulling all category data then filtering in JS for performance.
    //
    // Assumed SQL for a view or function `distinct_amazon_categories`:
    // CREATE OR REPLACE VIEW distinct_amazon_categories AS
    // SELECT DISTINCT category FROM amazon_products WHERE category IS NOT NULL ORDER BY category;
    //
    // Then you could query the view:
    // const { data, error } = await supabase.from('distinct_amazon_categories').select('category');
    //
    // Or call a function:
    // CREATE OR REPLACE FUNCTION get_distinct_categories()
    // RETURNS TABLE(category TEXT) AS $$
    // BEGIN
    //   RETURN QUERY SELECT DISTINCT ap.category FROM amazon_products ap WHERE ap.category IS NOT NULL ORDER BY ap.category;
    // END;
    // $$ LANGUAGE plpgsql;
    // const { data, error } = await supabase.rpc('get_distinct_categories');

    // For this example, let's use a simpler client-side distinct after fetching,
    // which is less performant for very large numbers of products but simpler for the client code.
    // A more optimized approach would be a dedicated SQL function/view as commented above.
    const { data: categoriesData, error } = await supabase
      .from('amazon_products')
      .select('category'); // Select only the category column

    if (error) {
      console.error('Supabase query error:', error);
      return res.status(500).json({ success: false, message: 'Error fetching categories from database.', details: error.message });
    }

    if (!categoriesData) {
        return res.status(200).json({ success: true, data: { categories: [] } });
    }

    // Extract unique, non-null categories and sort them
    const distinctCategories = Array.from(new Set(categoriesData.map(item => item.category)))
                                    .filter(category => category !== null && category !== undefined) as string[];
    distinctCategories.sort();


    res.status(200).json({
      success: true,
      data: { categories: distinctCategories },
    });

  } catch (e: any) {
    console.error('Server error in /api/amazon/categories:', e);
    res.status(500).json({ success: false, message: 'An unexpected server error occurred.', details: e.message });
  }
}
```
