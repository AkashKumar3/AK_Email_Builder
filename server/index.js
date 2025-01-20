import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv'
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.log(err));

const templateSchema = new mongoose.Schema({
  title: String,
  content: String,
  imageUrl: String,
  styles: {
    titleColor: String,
    contentColor: String,
    fontSize: String,
    alignment: String
  },
  createdAt: { type: Date, default: Date.now }
});

const Template = mongoose.model('Template', templateSchema);


const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage });


app.get('/api/templates', async (req, res) => {
  try {
    const templates = await Template.find().sort({ createdAt: -1 });
    res.json(templates);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching templates' });
  }
});


app.get('/api/templates/:id', async (req, res) => {
  try {
    const template = await Template.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    res.json(template);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching template' });
  }
});


app.put('/api/templates/:id', async (req, res) => {
  try {
    const template = await Template.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(template);
  } catch (error) {
    res.status(500).json({ error: 'Error updating template' });
  }
});


app.get('/api/getEmailLayout', (req, res) => {
  const layoutPath = join(__dirname, 'templates', 'layout.html');
  fs.readFile(layoutPath, 'utf8', (err, data) => {
    if (err) {
      res.status(500).json({ error: 'Error reading layout file' });
      return;
    }
    res.send(data);
  });
});


app.post('/api/uploadImage', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  res.json({ imageUrl: `/uploads/${req.file.filename}` });
});


app.post('/api/uploadEmailConfig', async (req, res) => {
  try {
    const template = new Template(req.body);
    await template.save();
    res.json({ success: true, template });
  } catch (error) {
    res.status(500).json({ error: 'Error saving template' });
  }
});


app.post('/api/renderAndDownloadTemplate', (req, res) => {
  const { template } = req.body;
  const layoutPath = join(__dirname, 'templates', 'layout.html');
  
  fs.readFile(layoutPath, 'utf8', (err, layout) => {
    if (err) {
      res.status(500).json({ error: 'Error reading layout file' });
      return;
    }

    let renderedTemplate = layout
      .replace('{{title}}', template.title)
      .replace('{{content}}', template.content)
      .replace('{{imageUrl}}', template.imageUrl || '');

    res.send(renderedTemplate);
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});