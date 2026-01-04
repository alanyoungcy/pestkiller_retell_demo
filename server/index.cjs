const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = 8080;

// Middleware
app.use(cors());
app.use(express.json());

const RETELL_API_KEY = process.env.RETELL_API_KEY;

if (!RETELL_API_KEY) {
  console.error('ERROR: RETELL_API_KEY is not set in .env file');
  process.exit(1);
}

// Create web call endpoint
app.post('/create-web-call', async (req, res) => {
  const { agent_id, metadata, retell_llm_dynamic_variables } = req.body;

  if (!agent_id) {
    return res.status(400).json({ error: 'agent_id is required' });
  }

  try {
    const payload = { agent_id };

    if (metadata) {
      payload.metadata = metadata;
    }

    if (retell_llm_dynamic_variables) {
      payload.retell_llm_dynamic_variables = retell_llm_dynamic_variables;
    }

    const response = await fetch('https://api.retellai.com/v2/create-web-call', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RETELL_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Retell API error:', errorText);
      return res.status(response.status).json({
        error: 'Failed to create web call',
        details: errorText
      });
    }

    const data = await response.json();
    console.log('Web call created successfully');
    res.status(201).json(data);
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('RETELL_API_KEY loaded from .env');
});
