-- Table for storing Amazon product data
CREATE TABLE amazon_products (
    id SERIAL PRIMARY KEY,
    asin TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    price DECIMAL(10, 2),
    currency VARCHAR(10),
    bsr INTEGER,
    rating DECIMAL(3, 1),
    reviews_count INTEGER,
    image_url TEXT,
    product_url TEXT,
    category TEXT,
    date_first_available TIMESTAMP WITH TIME ZONE,
    is_prime BOOLEAN,
    is_fba BOOLEAN,
    sales_volume_text TEXT,
    delivery_info_text TEXT,
    data_source_api VARCHAR(255),
    fetched_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for amazon_products table
CREATE INDEX idx_amazon_products_asin ON amazon_products (asin);
CREATE INDEX idx_amazon_products_bsr ON amazon_products (bsr);
CREATE INDEX idx_amazon_products_category ON amazon_products (category);
CREATE INDEX idx_amazon_products_date_first_available ON amazon_products (date_first_available);

-- Table for storing niche research keywords
CREATE TABLE niche_research_keywords (
    id SERIAL PRIMARY KEY,
    niche_query TEXT NOT NULL,
    keyword TEXT NOT NULL,
    relevance_score DECIMAL(5,2),
    source VARCHAR(255),
    researched_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    CONSTRAINT uq_niche_keyword UNIQUE (niche_query, keyword)
);

-- Indexes for niche_research_keywords table
CREATE INDEX idx_niche_research_keywords_niche_query ON niche_research_keywords (niche_query);
CREATE INDEX idx_niche_research_keywords_keyword ON niche_research_keywords (keyword);

-- Table for storing sub-niche ideas
CREATE TABLE sub_niche_ideas (
    id SERIAL PRIMARY KEY,
    niche_query TEXT NOT NULL,
    sub_niche_description TEXT NOT NULL,
    potential_target_audience TEXT,
    source VARCHAR(255),
    researched_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for sub_niche_ideas table
CREATE INDEX idx_sub_niche_ideas_niche_query ON sub_niche_ideas (niche_query);

-- Table for storing IP risk terms
CREATE TABLE ip_risk_terms (
    id SERIAL PRIMARY KEY,
    term TEXT UNIQUE NOT NULL,
    risk_level VARCHAR(50),
    reason TEXT,
    source VARCHAR(255),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for ip_risk_terms table
CREATE INDEX idx_ip_risk_terms_term ON ip_risk_terms (term);
