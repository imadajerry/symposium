import React, { useState, useRef } from 'react';
import { Upload, FileText, Image, Type, X, Check, Loader } from 'lucide-react';
import classNames from 'classnames';
import { useData } from '../../context';
import type { Course } from '../../types';
import { logger } from '../../utils/config';

interface CourseUploadProps {
  onClose: () => void;
  onSuccess?: (course: Course) => void;
}

const CourseUpload: React.FC<CourseUploadProps> = ({ onClose, onSuccess }) => {
  const { addCourse } = useData();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [uploadType, setUploadType] = useState<'pdf' | 'image' | 'text'>('text');
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    textContent: '',
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    logger.log('File selected:', file.name, file.type);

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      setUploadType('image');
    } else if (file.type === 'application/pdf') {
      setPreviewUrl('');
      setUploadType('pdf');
    }
  };

  const processFile = async (): Promise<string> => {
    // Simulate file processing
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    if (uploadType === 'image' && previewUrl) {
      // In production, you'd send this to an OCR service
      logger.log('Processing image for text extraction...');
      return previewUrl;
    }
    
    if (uploadType === 'pdf' && uploadedFile) {
      // In production, you'd parse the PDF
      logger.log('Processing PDF...');
      return `PDF: ${uploadedFile.name}`;
    }
    
    return formData.textContent;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) return;
    
    setIsProcessing(true);
    
    try {
      await processFile();

      const newCourse = await addCourse({
        title: formData.title,
        description: formData.description,
        textContent: uploadType === 'text' ? formData.textContent : undefined,
        file: uploadType !== 'text' ? uploadedFile : null,
      });
      logger.log('Course created:', newCourse.title);
      
      onSuccess?.(newCourse);
      onClose();
    } catch (error) {
      logger.error('Failed to create course:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="glass-panel w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200/50">
          <h2 className="text-xl font-bold text-gray-800">Add Course Material</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Course Info */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Course Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="input-glass"
                placeholder="e.g., Introduction to Physics"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="input-glass"
                placeholder="Brief description of the course"
              />
            </div>
          </div>

          {/* Upload Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Material Type
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { type: 'text' as const, icon: Type, label: 'Text' },
                { type: 'pdf' as const, icon: FileText, label: 'PDF' },
                { type: 'image' as const, icon: Image, label: 'Image' },
              ].map(({ type, icon: Icon, label }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setUploadType(type);
                    setUploadedFile(null);
                    setPreviewUrl('');
                  }}
                  className={classNames(
                    'p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all',
                    uploadType === type
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-600'
                  )}
                >
                  <Icon className="w-6 h-6" />
                  <span className="text-sm font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Content Input based on type */}
          {uploadType === 'text' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Syllabus Content
              </label>
              <textarea
                value={formData.textContent}
                onChange={(e) => setFormData(prev => ({ ...prev, textContent: e.target.value }))}
                className="input-glass min-h-[200px] resize-y"
                placeholder="Paste or type your course syllabus here..."
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload {uploadType === 'pdf' ? 'PDF' : 'Image'}
              </label>
              
              <input
                ref={fileInputRef}
                type="file"
                accept={uploadType === 'pdf' ? '.pdf' : 'image/*'}
                onChange={handleFileChange}
                className="hidden"
              />
              
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={classNames(
                  'w-full p-8 border-2 border-dashed rounded-xl transition-all',
                  uploadedFile
                    ? 'border-green-400 bg-green-50'
                    : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                )}
              >
                {uploadedFile ? (
                  <div className="flex items-center justify-center gap-3 text-green-700">
                    <Check className="w-6 h-6" />
                    <span className="font-medium">{uploadedFile.name}</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-gray-500">
                    <Upload className="w-8 h-8" />
                    <span>Click to upload or drag and drop</span>
                    <span className="text-xs">
                      {uploadType === 'pdf' ? 'PDF files only' : 'PNG, JPG, GIF up to 10MB'}
                    </span>
                  </div>
                )}
              </button>
              
              {/* Image Preview */}
              {previewUrl && uploadType === 'image' && (
                <div className="mt-4">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="max-h-48 rounded-lg mx-auto shadow-md"
                  />
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isProcessing || !formData.title.trim()}
              className={classNames(
                'flex-1 btn-primary flex items-center justify-center gap-2',
                (isProcessing || !formData.title.trim()) && 'opacity-70 cursor-not-allowed'
              )}
            >
              {isProcessing ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  Create Course
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CourseUpload;
