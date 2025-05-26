import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Initialize Supabase client
// These would typically be in a shared lib or env config
const SUPABASE_URL = process.env.SUPABASE_URL || 'your-supabase-url-placeholder'; // Placeholder
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'your-supabase-service-key-placeholder'; // Placeholder
const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Environment variable for API key
const MERCHBOT_API_KEY = process.env.MERCHBOT_API_KEY || 'your-merchbot-api-key-placeholder'; // Placeholder for testing

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
  date_first_available?: string | null; // ISO date string
  is_prime?: boolean | null;
  is_fba?: boolean | null;
  sales_volume_text?: string | null;
  delivery_info_text?: string | null;
  data_source_api?: string | null;
  fetched_at: string;
  created_at: string;
}

interface Pagination {
  page: number;
  limit: number;
  total_results: number;
  total_pages: number;
}

interface SuccessResponse {
  success: true;
  data: {
    products: Product[];
    pagination: Pagination;
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
    // In a real app, ensure MERCHBOT_API_KEY is actually set in the environment
    // For this placeholder setup, if it's the placeholder key, it will fail unless the header matches the placeholder
    return res.status(401).json({ success: false, message: 'Unauthorized: Invalid or missing API Key' });
  }

  try {
    // --- Parse and Validate Query Parameters ---
    const {
      bsrMin, bsrMax, priceMin, priceMax, reviewsMin, reviewsMax, ratingMin, ratingMax,
      publishedDaysAgoMin, publishedDaysAgoMax, category, excludedKeywords,
      primeOnly, fbaOnly, asin, titleKeyword,
      sortBy = 'bsr_asc', 
      page = '1', // Query params are strings
      limit = '20',
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    if (isNaN(pageNum) || pageNum < 1) {
        return res.status(400).json({ success: false, message: 'Invalid page number.'});
    }
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) { // Max limit 100
        return res.status(400).json({ success: false, message: 'Invalid limit value. Must be between 1 and 100.'});
    }
    const offset = (pageNum - 1) * limitNum;

    let query = supabase.from('amazon_products').select('*', { count: 'exact' });

    // --- Dynamically Build Supabase Query ---
    if (bsrMin) query = query.gte('bsr', parseInt(bsrMin as string));
    if (bsrMax) query = query.lte('bsr', parseInt(bsrMax as string));
    if (priceMin) query = query.gte('price', parseFloat(priceMin as string));
    if (priceMax) query = query.lte('price', parseFloat(priceMax as string));
    if (reviewsMin) query = query.gte('reviews_count', parseInt(reviewsMin as string));
    if (reviewsMax) query = query.lte('reviews_count', parseInt(reviewsMax as string));
    if (ratingMin) query = query.gte('rating', parseFloat(ratingMin as string));
    if (ratingMax) query = query.lte('rating', parseFloat(ratingMax as string));

    if (publishedDaysAgoMin) {
      const date = new Date();
      date.setDate(date.getDate() - parseInt(publishedDaysAgoMin as string));
      query = query.lte('date_first_available', date.toISOString());
    }
    if (publishedDaysAgoMax) {
      const date = new Date();
      date.setDate(date.getDate() - parseInt(publishedDaysAgoMax as string));
      query = query.gte('date_first_available', date.toISOString());
    }
    
    if (category) query = query.eq('category', category as string);
    if (primeOnly === 'true') query = query.is('is_prime', true); // Use .is for boolean
    if (fbaOnly === 'true') query = query.is('is_fba', true);     // Use .is for boolean
    if (asin) query = query.eq('asin', asin as string);
    if (titleKeyword) query = query.ilike('title', `%${titleKeyword}%`);

    if (excludedKeywords) {
      const keywords = (excludedKeywords as string).split(',');
      keywords.forEach(keyword => {
        if (keyword.trim()) { // Ensure keyword is not empty
          query = query.not('title', 'ilike', `%${keyword.trim()}%`);
        }
      });
    }

    const sortParts = (sortBy as string).split('_');
    const sortColumn = sortParts[0] === 'date' ? 'date_first_available' : sortParts[0];
    const sortDirection = sortParts[1] === 'desc' ? false : true; // false for descending
    if (sortColumn) { // Ensure sortColumn is valid before applying
        query = query.order(sortColumn, { ascending: sortDirection });
    }


    query = query.range(offset, offset + limitNum - 1);

    const { data: productsData, error, count } = await query;

    if (error) {
      console.error('Supabase query error:', error);
      return res.status(500).json({ success: false, message: 'Error fetching products from database.', details: error.message });
    }

    const totalResults = count || 0;
    const totalPages = Math.ceil(totalResults / limitNum);

    res.status(200).json({
      success: true,
      data: {
        products: productsData as Product[],
        pagination: {
          page: pageNum,
          limit: limitNum,
          total_results: totalResults,
          total_pages: totalPages,
        },
      },
    });

  } catch (e: any) {
    console.error('Server error in /api/amazon/bestsellers:', e);
    res.status(500).json({ success: false, message: 'An unexpected server error occurred.', details: e.message });
  }
}

// Basic validation helper (example)
function isValidSortBy(sortBy: string): boolean {
    const validSorts = ['bsr_asc', 'bsr_desc', 'price_asc', 'price_desc', 'rating_desc', 'reviews_desc', 'date_desc', 'date_asc'];
    return validSorts.includes(sortBy);
}
```
