// server.js - Main API server file with Supabase integration
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const handlebars = require('handlebars');
const { v4: uuidv4 } = require('uuid');
const { createClient } = require('@supabase/supabase-js');

require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL || 'https://ydbzqgylinzmnsendhes.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkYnpxZ3lsaW56bW5zZW5kaGVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQwMTc5MTEsImV4cCI6MjA1OTU5MzkxMX0.geRuGQI8Vd_eg90YjS18aF334RRxs_Qm_Hlh6zEGVLI';
const supabase = createClient(supabaseUrl, supabaseKey);

// Register Handlebars helpers
handlebars.registerHelper('formatNumber', function(number) {
  return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
});

handlebars.registerHelper('calculatePricePerSqFt', function(price, size) {
  if (!price || !size || size === 0) return "N/A";
  const pricePerSqFt = (price / size).toFixed(2);
  return pricePerSqFt.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
});

// API Endpoint to save property data from SendPulse
app.post('/api/properties', async (req, res) => {
  try {
    const { 
      title, 
      type, 
      status, 
      price, 
      size, 
      bedrooms, 
      bathrooms,
      indoor_features,
      outdoor_features,
      building_amenities,
      parking,
      unique_points,
      virtual_tour_url,
      down_payment,
      installment_plan,
      additional_fees,
      images,
      agent_email,
      agent_phone
    } = req.body;

    // Insert into Supabase
    const { data, error } = await supabase
      .from('properties')
      .insert([{ 
        title, 
        type, 
        status, 
        price, 
        size, 
        bedrooms, 
        bathrooms,
        indoor_features,
        outdoor_features,
        building_amenities,
        parking,
        unique_points,
        virtual_tour_url,
        down_payment,
        installment_plan,
        additional_fees,
        images,
        agent_email,
        agent_phone
      }])
      .select();
    
    if (error) throw error;
    
    const propertyId = data[0].id;
    
    // Generate presentation URL
    const presentationUrl = `${req.protocol}://${req.get('host')}/presentation/${propertyId}`;
    
    res.status(201).json({
      success: true,
      property_id: propertyId,
      presentation_url: presentationUrl
    });
  } catch (error) {
    console.error('Error saving property:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to save property data' 
    });
  }
});

// API Endpoint to get property data
app.get('/api/properties/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
    if (!data) {
      return res.status(404).json({ success: false, error: 'Property not found' });
    }
    
    res.json({
      success: true,
      property: data
    });
  } catch (error) {
    console.error('Error fetching property:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch property data' 
    });
  }
});

// Serve presentation page
app.get('/presentation/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
    if (!data) {
      return res.status(404).send('Property not found');
    }
    
    // Read presentation template
    const templatePath = path.join(__dirname, 'templates', 'presentation.hbs');
    const templateSource = fs.readFileSync(templatePath, 'utf8');
    const template = handlebars.compile(templateSource);
    
    // Render template with property data
    const html = template(data);
    
    res.send(html);
  } catch (error) {
    console.error('Error generating presentation:', error);
    res.status(500).send('Failed to generate presentation');
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});