import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { ChromePicker } from 'react-color';
import axios from 'axios';
import './App.css';

function App() {
  const [template, setTemplate] = useState({
    title: '',
    content: '',
    imageUrl: '',
    styles: {
      titleColor: '#000000',
      contentColor: '#000000',
      fontSize: '16px',
      alignment: 'left'
    }
  });

  const [templates, setTemplates] = useState([]);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [sections, setSections] = useState(['title', 'image', 'content']);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await axios.get('https://ak-email-builder-backend.onrender.com/api/templates');
      setTemplates(response.data);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const handleTemplateSelect = async (e) => {
    const templateId = e.target.value;
    setSelectedTemplateId(templateId);

    if (templateId) {
      setIsLoading(true);
      try {
        const response = await axios.get(`https://ak-email-builder-backend.onrender.com/api/templates/${templateId}`);
        setTemplate(response.data);
      } catch (error) {
        console.error('Error loading template:', error);
      }
      setIsLoading(false);
    } else {
      // Reset to empty template
      setTemplate({
        title: '',
        content: '',
        imageUrl: '',
        styles: {
          titleColor: '#000000',
          contentColor: '#000000',
          fontSize: '16px',
          alignment: 'left'
        }
      });
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setTemplate(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    try {
      setIsLoading(true);
      const response = await axios.post('https://ak-email-builder-backend.onrender.com/api/uploadImage', formData);
      setTemplate(prev => ({
        ...prev,
        imageUrl: response.data.imageUrl
      }));
    } catch (error) {
      console.error('Error uploading image:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleColorChange = (color) => {
    setTemplate(prev => ({
      ...prev,
      styles: {
        ...prev.styles,
        titleColor: color.hex
      }
    }));
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(sections);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setSections(items);
  };

  const saveTemplate = async () => {
    try {
      setIsLoading(true);
      if (selectedTemplateId) {
        await axios.put(`https://ak-email-builder-backend.onrender.com/api/templates/${selectedTemplateId}`, template);
      } else {
        await axios.post('https://ak-email-builder-backend.onrender.com/api/uploadEmailConfig', template);
      }
      await fetchTemplates();
      alert('Template saved successfully!');
    } catch (error) {
      console.error('Error saving template:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const downloadTemplate = async () => {
    try {
      setIsLoading(true);
      const response = await axios.post('https://ak-email-builder-backend.onrender.com/api/renderAndDownloadTemplate', {
        template
      });
      
      const blob = new Blob([response.data], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'email-template.html';
      a.click();
    } catch (error) {
      console.error('Error downloading template:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-wrapper">
      <div className="app-header">
        <h1>Email Builder</h1>
        <div className="template-selector">
          <select 
            value={selectedTemplateId} 
            onChange={handleTemplateSelect}
            className="template-select"
          >
            <option value="">Create New Template</option>
            {templates.map(t => (
              <option key={t._id} value={t._id}>{t.title || 'Untitled Template'}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="app-container">
        <div className="editor-panel">
          <div className="panel-header">
            <h2>Editor</h2>
          </div>
          
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="sections">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="sections-container">
                  {sections.map((section, index) => (
                    <Draggable key={section} draggableId={section} index={index}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className="section"
                        >
                          <div className="section-header">
                            <span className="section-title">{section.charAt(0).toUpperCase() + section.slice(1)}</span>
                            <span className="drag-handle">☰</span>
                          </div>

                          {section === 'title' && (
                            <div className="input-group">
                              <input
                                type="text"
                                name="title"
                                value={template.title}
                                onChange={handleInputChange}
                                placeholder="Enter title..."
                                className="fancy-input"
                              />
                              <button 
                                onClick={() => setShowColorPicker(!showColorPicker)}
                                className="color-button"
                                style={{ backgroundColor: template.styles.titleColor }}
                              >
                                Color
                              </button>
                              {showColorPicker && (
                                <div className="color-picker-popover">
                                  <div className="color-picker-cover" onClick={() => setShowColorPicker(false)} />
                                  <ChromePicker
                                    color={template.styles.titleColor}
                                    onChange={handleColorChange}
                                  />
                                </div>
                              )}
                            </div>
                          )}

                          {section === 'image' && (
                            <div className="input-group">
                              <div className="image-upload-container">
                                <input
                                  type="file"
                                  onChange={handleImageUpload}
                                  accept="image/*"
                                  className="file-input"
                                  id="image-upload"
                                />
                                <label htmlFor="image-upload" className="file-input-label">
                                  {template.imageUrl ? 'Change Image' : 'Upload Image'}
                                </label>
                                {template.imageUrl && (
                                  <div className="image-preview">
                                    <img src={template.imageUrl} alt="Preview" />
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {section === 'content' && (
                            <div className="input-group">
                              <textarea
                                name="content"
                                value={template.content}
                                onChange={handleInputChange}
                                placeholder="Enter content..."
                                className="fancy-textarea"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>

          <div className="style-controls">
            <div className="control-group">
              <label>Text Alignment</label>
              <div className="alignment-buttons">
                {['left', 'center', 'right'].map(align => (
                  <button
                    key={align}
                    className={`align-button ${template.styles.alignment === align ? 'active' : ''}`}
                    onClick={() => setTemplate(prev => ({
                      ...prev,
                      styles: { ...prev.styles, alignment: align }
                    }))}
                  >
                    {align === 'left' && '⫷'}
                    {align === 'center' && '☰'}
                    {align === 'right' && '⫸'}
                  </button>
                ))}
              </div>
            </div>

            <div className="control-group">
              <label>Font Size</label>
              <select
                value={template.styles.fontSize}
                onChange={(e) => setTemplate(prev => ({
                  ...prev,
                  styles: { ...prev.styles, fontSize: e.target.value }
                }))}
                className="fancy-select"
              >
                <option value="12px">Small</option>
                <option value="16px">Medium</option>
                <option value="20px">Large</option>
              </select>
            </div>
          </div>

          <div className="button-group">
            <button onClick={saveTemplate} className="primary-button" disabled={isLoading}>
              {isLoading ? 'Saving...' : (selectedTemplateId ? 'Update Template' : 'Save Template')}
            </button>
            <button onClick={downloadTemplate} className="secondary-button" disabled={isLoading}>
              {isLoading ? 'Generating...' : 'Download HTML'}
            </button>
          </div>
        </div>

        <div className="preview-panel">
          <div className="panel-header">
            <h2>Preview</h2>
          </div>
          <div className="preview-container" style={{ textAlign: template.styles.alignment }}>
            <h1 style={{ color: template.styles.titleColor }}>{template.title || 'Your Title Here'}</h1>
            {template.imageUrl && (
              <img src={template.imageUrl} alt="Preview" style={{ maxWidth: '100%' }} />
            )}
            <div style={{ fontSize: template.styles.fontSize }}>
              {template.content || 'Your content will appear here...'}
            </div>
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
        </div>
      )}
    </div>
  );
}

export default App;