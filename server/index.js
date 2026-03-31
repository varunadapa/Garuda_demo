const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// serve static client
app.use('/', express.static(path.join(__dirname, '..', 'client')));

// helper
function readJSON(name) {
  const p = path.join(__dirname, 'data', name + '.json');
  if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
  return [];
}

// API endpoints
app.get('/api/dashboard', (req, res) => res.json(readJSON('dashboard')));

app.get('/api/crimes', (req, res) => res.json(readJSON('crimes')));
app.get('/api/crimes/:id', (req, res) => {
  const items = readJSON('crimes');
  const item = items.find(i => i.crime_id === req.params.id);
  if (!item) return res.status(404).json({ error: 'not found' });
  res.json(item);
});

app.get('/api/persons', (req, res) => res.json(readJSON('persons')));
app.get('/api/persons/:id', (req, res) => {
  const items = readJSON('persons');
  const item = items.find(i => i.person_id === req.params.id);
  if (!item) return res.status(404).json({ error: 'not found' });
  res.json(item);
});

app.get('/api/accuseds', (req, res) => res.json(readJSON('accuseds')));
app.get('/api/accuseds/:id', (req, res) => {
  const items = readJSON('accuseds');
  const item = items.find(i => i.accused_id === req.params.id);
  if (!item) return res.status(404).json({ error: 'not found' });
  res.json(item);
});

app.get('/api/hierarchy', (req, res) => res.json(readJSON('hierarchy')));
app.get('/api/interrogations', (req, res) => res.json(readJSON('interrogations')));
app.get('/api/chargesheets', (req, res) => res.json(readJSON('chargesheets')));
app.get('/api/seizures', (req, res) => res.json(readJSON('seizures')));
app.get('/api/integrations', (req, res) => res.json(readJSON('integrations')));

app.get('/api/networks', (req, res) => res.json(readJSON('networks')));
app.get('/api/integration-details', (req, res) => res.json(readJSON('integration_details')));
app.get('/api/integration-details/:id', (req, res) => {
  const details = readJSON('integration_details');
  const detail = details[req.params.id];
  if (!detail) return res.status(404).json({ error: 'not found' });
  res.json(detail);
});

const { OpenAI } = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'mock' });

app.post('/api/chat', async (req, res) => {
  const { message, history = [] } = req.body;
  if (!message) return res.status(400).json({ error: 'No message provided' });

  // Simulation mode if no real key provided
  if (!process.env.OPENAI_API_KEY) {
    const crimes = readJSON('crimes');
    const accuseds = readJSON('accuseds');

    let reply = "I am currently running in **Simulation Mode** (no `OPENAI_API_KEY` provided). Here is the structured intelligence data I found:\n\n";

    const msg = message.toLowerCase();
    if (msg.includes('rafiq')) {
      const target = accuseds.find(a => a.name && a.name.toLowerCase().includes('rafiq'));
      if (target) {
        reply += `### Criminal Profile: ${target.name}\n\n`;
        reply += `| Field | Details |\n|---|---|\n`;
        reply += `| **Alias** | ${target.alias || 'N/A'} |\n`;
        reply += `| **Type** | ${target.type} |\n`;
        reply += `| **Risk Level** | **${target.riskLevel.toUpperCase()}** |\n`;
        reply += `| **Arrests** | ${target.arrestCount} |\n`;
        reply += `| **Current Status** | ${target.currentStatus} |\n`;
      }
    } else if (msg.includes('142/2026')) {
      const fir = crimes.find(c => c.fir_num && c.fir_num.includes('142/2026'));
      if (fir) {
        reply += `### Case Summary: ${fir.fir_num}\n\n`;
        reply += `**Status:** ${fir.status} | **Date:** ${fir.date} | **District:** ${fir.district}\n\n`;
        reply += `> ${fir.description}\n`;
      }
    } else if (msg.includes('integration') || msg.includes('pending')) {
      const ints = readJSON('integrations');
      reply += `### Pending Database Integrations\n\n`;
      reply += `| Integration Name | Status | Sub-systems |\n|---|---|---|\n`;
      ints.filter(i => i.status !== 'Active').forEach(i => {
        reply += `| **${i.name}** | ${i.status} | ${i.sub_systems} |\n`;
      });
    } else {
      reply += "I couldn't match that query to a specific mock scenario. Try asking about *'Rafiq Khan'*, *'FIR 142/2026'*, or *'pending integrations'*! Add an `OPENAI_API_KEY` to enable true GPT-like inference on all your data.";
    }

    return setTimeout(() => res.json({ reply }), 1000); // Artificial delay to simulate processing
  }

  // Real LLM inference
  try {
    const crimes = readJSON('crimes').slice(0, 5); // Basic context length limitation
    const accuseds = readJSON('accuseds').slice(0, 5);
    const systemPrompt = "You are Garuda AI, a highly intelligent criminal analysis system. Answer the user strictly using the context below. Format all responses clearly using Markdown and Tables.\n\nContext:\n" + JSON.stringify({ crimes, accuseds });

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: message }
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages
    });

    res.json({ reply: completion.choices[0].message.content });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Garuda running on http://localhost:${PORT}`));
