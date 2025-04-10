import os
import uuid
from werkzeug.utils import secure_filename

# الأنواع المسموح بها للملفات
ALLOWED_EXTENSIONS = {
    'pdf', 'doc', 'docx',                      # ملفات الكتب والملخصات
    'jpg', 'jpeg', 'png', 'gif', 'webp'        # ملفات الصور
}

# حجم الملف الأقصى (10 ميجابايت)
MAX_FILE_SIZE = 10 * 1024 * 1024

# حجم الصورة الأقصى (500 كيلوبايت)
MAX_IMAGE_SIZE = 500 * 1024

def allowed_file(filename):
    """التحقق من امتداد الملف"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def save_file(file, file_type):
    """
    حفظ الملف في المسار المناسب حسب نوعه
    
    Args:
        file: الملف المراد حفظه
        file_type (str): نوع الملف (book, summary, question, answer, image)
    
    Returns:
        str: مسار الملف المحفوظ
    """
    if not file:
        return None
    
    # التحقق من صحة الملف
    if not allowed_file(file.filename):
        raise ValueError(f"نوع الملف غير مسموح به. الأنواع المسموحة: {', '.join(ALLOWED_EXTENSIONS)}")
    
    # التحقق من حجم الملف
    if file_type == 'image' and file.content_length > MAX_IMAGE_SIZE:
        raise ValueError(f"حجم الصورة كبير جدًا. الحد الأقصى: {MAX_IMAGE_SIZE/1024} كيلوبايت")
    elif file.content_length > MAX_FILE_SIZE:
        raise ValueError(f"حجم الملف كبير جدًا. الحد الأقصى: {MAX_FILE_SIZE/(1024*1024)} ميجابايت")
    
    # إنشاء اسم فريد للملف
    original_filename = secure_filename(file.filename)
    filename = f"{uuid.uuid4().hex}_{original_filename}"
    
    # تحديد المسار بناءً على نوع الملف
    if file_type == 'book':
        directory = 'static/uploads/books'
    elif file_type == 'summary':
        directory = 'static/uploads/summaries'
    elif file_type == 'question':
        directory = 'static/uploads/questions'
    elif file_type == 'answer':
        directory = 'static/uploads/answers'
    elif file_type == 'image':
        directory = 'static/uploads/images'
    else:
        directory = 'static/uploads/others'
    
    # التأكد من وجود المسار
    os.makedirs(directory, exist_ok=True)
    
    # حفظ الملف
    file_path = os.path.join(directory, filename)
    file.save(file_path)
    
    # إرجاع المسار النسبي للاستخدام في قاعدة البيانات
    return file_path

def delete_file(file_path):
    """
    حذف الملف من المسار المحدد
    
    Args:
        file_path (str): مسار الملف المراد حذفه
    """
    if file_path and os.path.exists(file_path):
        os.remove(file_path)