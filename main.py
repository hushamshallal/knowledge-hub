import os
import json
from flask import Flask, render_template, request, redirect, url_for, flash, jsonify, session, send_file
from werkzeug.security import generate_password_hash, check_password_hash
from models import db, User, Book, Summary, Question, Answer
from file_handler import save_file, delete_file
import secrets

app = Flask(__name__)

# إعدادات قاعدة البيانات
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# مفتاح السر للجلسة
app.secret_key = os.environ.get("SESSION_SECRET", secrets.token_hex(16))

# تهيئة قاعدة البيانات
db.init_app(app)

# إنشاء المجلدات اللازمة
for folder in ['books', 'summaries', 'questions', 'answers', 'images']:
    os.makedirs(f'static/uploads/{folder}', exist_ok=True)

# دالة التهيئة التي تُنفذ عند تشغيل التطبيق
def create_tables_and_admin():
    """إنشاء الجداول وإضافة حساب المسؤول الافتراضي عند بدء التطبيق"""
    with app.app_context():
        db.create_all()
        
        # التحقق من وجود حساب المسؤول
        admin = User.query.filter_by(username='admin').first()
        if not admin:
            admin = User(username='admin', role='admin')
            admin.set_password('admin@1234')
            db.session.add(admin)
            
            # إضافة حساب طالب افتراضي
            student = User(username='طالب', role='student')
            student.set_password('student123')
            db.session.add(student)
            
            db.session.commit()

# تنفيذ دالة التهيئة عند بدء التطبيق
create_tables_and_admin()

# ================== صفحات الموقع ==================

@app.route('/')
def index():
    """الصفحة الرئيسية"""
    return render_template('index.html')

@app.route('/login')
def login():
    """صفحة تسجيل الدخول"""
    # إذا كان المستخدم مسجل الدخول بالفعل، توجيه إلى الصفحة الرئيسية
    if 'user_id' in session:
        return redirect(url_for('index'))
    return render_template('login.html')

@app.route('/test')
def test():
    """صفحة اختبار"""
    return render_template('test.html')

@app.route('/logout')
def logout():
    """تسجيل الخروج"""
    session.clear()
    return redirect(url_for('login'))

# ================== واجهة برمجة التطبيقات (API) ==================

@app.route('/api/login', methods=['POST'])
def api_login():
    """واجهة برمجة تسجيل الدخول"""
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({'success': False, 'message': 'يرجى ملء جميع الحقول المطلوبة'})
    
    user = User.query.filter_by(username=username).first()
    
    if user and user.check_password(password):
        # تخزين بيانات المستخدم في الجلسة
        session['user_id'] = user.id
        session['username'] = user.username
        session['role'] = user.role
        
        return jsonify({
            'success': True,
            'user': {
                'id': user.id,
                'username': user.username,
                'role': user.role
            }
        })
    
    return jsonify({'success': False, 'message': 'اسم المستخدم أو كلمة المرور غير صحيحة'})

@app.route('/api/register', methods=['POST'])
def api_register():
    """واجهة برمجة إنشاء حساب جديد"""
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    role = 'student'  # كل المستخدمين الجدد هم طلاب
    
    if not username or not password:
        return jsonify({'success': False, 'message': 'يرجى ملء جميع الحقول المطلوبة'})
    
    # التحقق من عدم وجود المستخدم مسبقاً
    existing_user = User.query.filter_by(username=username).first()
    if existing_user:
        return jsonify({'success': False, 'message': 'اسم المستخدم موجود بالفعل'})
    
    # إنشاء المستخدم الجديد
    new_user = User(username=username, role=role)
    new_user.set_password(password)
    db.session.add(new_user)
    db.session.commit()
    
    # تسجيل الدخول تلقائياً
    session['user_id'] = new_user.id
    session['username'] = new_user.username
    session['role'] = new_user.role
    
    return jsonify({
        'success': True,
        'user': {
            'id': new_user.id,
            'username': new_user.username,
            'role': new_user.role
        }
    })

@app.route('/api/users', methods=['GET'])
def api_get_users():
    """واجهة برمجة للحصول على قائمة المستخدمين"""
    if 'user_id' not in session or session['role'] != 'admin':
        return jsonify({'success': False, 'message': 'غير مصرح لك بالوصول'})
    
    users = User.query.all()
    users_list = [
        {
            'id': user.id,
            'username': user.username,
            'role': user.role,
            'createdAt': user.created_at.isoformat()
        }
        for user in users
    ]
    
    return jsonify({'success': True, 'users': users_list})

@app.route('/api/users/<int:user_id>', methods=['DELETE'])
def api_delete_user(user_id):
    """واجهة برمجة لحذف مستخدم"""
    if 'user_id' not in session or session['role'] != 'admin':
        return jsonify({'success': False, 'message': 'غير مصرح لك بالوصول'})
    
    # لا يمكن حذف حساب المسؤول الرئيسي
    if user_id == 1:
        return jsonify({'success': False, 'message': 'لا يمكن حذف حساب المسؤول الرئيسي'})
    
    user = User.query.get(user_id)
    if not user:
        return jsonify({'success': False, 'message': 'المستخدم غير موجود'})
    
    db.session.delete(user)
    db.session.commit()
    
    return jsonify({'success': True})

@app.route('/api/books', methods=['GET'])
def api_get_books():
    """واجهة برمجة للحصول على قائمة الكتب"""
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'يرجى تسجيل الدخول'})
    
    books = Book.query.all()
    books_list = []
    
    for book in books:
        creator = User.query.get(book.user_id) if book.user_id else None
        creator_name = creator.username if creator else 'غير معروف'
        
        books_list.append({
            'id': book.id,
            'title': book.title,
            'author': book.author,
            'description': book.description,
            'file': book.file_path,
            'image': book.image_path,
            'sourceType': book.source_type,
            'addedBy': creator_name,
            'addedDate': book.created_at.isoformat(),
            'summaries': [
                {
                    'id': summary.id,
                    'title': summary.title,
                    'file': summary.file_path,
                    'date': summary.created_at.isoformat()
                }
                for summary in book.summaries
            ],
            'questionFiles': [
                {
                    'id': question.id,
                    'title': question.title,
                    'file': question.file_path,
                    'date': question.created_at.isoformat(),
                    'answerId': question.answer.id if question.answer else None,
                    'answerFile': question.answer.file_path if question.answer else None
                }
                for question in book.questions
            ]
        })
    
    return jsonify({'success': True, 'books': books_list})

@app.route('/api/books', methods=['POST'])
def api_add_book():
    """واجهة برمجة لإضافة كتاب جديد"""
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'يرجى تسجيل الدخول'})
    
    if session['role'] != 'admin':
        return jsonify({'success': False, 'message': 'عذراً، فقط المسؤولين يمكنهم إضافة كتب جديدة'})
    
    # التعامل مع البيانات النصية
    title = request.form.get('title')
    author = request.form.get('author')
    description = request.form.get('description', '')
    source_type = request.form.get('sourceType', 'file')
    summary_title = request.form.get('summaryTitle', '')
    questions_title = request.form.get('questionsTitle', '')
    
    # التحقق من توفر البيانات الأساسية
    if not title or not author:
        return jsonify({'success': False, 'message': 'يرجى ملء الحقول المطلوبة: عنوان الكتاب والمؤلف'})
    
    try:
        # معالجة ملف الكتاب أو الرابط
        book_path = None
        if source_type == 'file':
            book_file = request.files.get('bookFile')
            if not book_file:
                return jsonify({'success': False, 'message': 'يرجى اختيار ملف الكتاب'})
            book_path = save_file(book_file, 'book')
        else:
            book_link = request.form.get('bookLink')
            if not book_link:
                return jsonify({'success': False, 'message': 'يرجى إدخال رابط الكتاب'})
            book_path = book_link
        
        # معالجة صورة الغلاف
        image_path = None
        image_file = request.files.get('bookImage')
        if image_file:
            image_path = save_file(image_file, 'image')
        
        # إنشاء الكتاب الجديد
        new_book = Book(
            title=title,
            author=author,
            description=description,
            file_path=book_path,
            image_path=image_path,
            source_type=source_type,
            user_id=session['user_id']
        )
        db.session.add(new_book)
        db.session.flush()  # للحصول على ID قبل الالتزام النهائي
        
        # معالجة ملف الملخص إذا وجد
        summary_file = request.files.get('summaryFile')
        if summary_file:
            summary_path = save_file(summary_file, 'summary')
            summary = Summary(
                title=summary_title or 'الملخص الرئيسي',
                file_path=summary_path,
                book_id=new_book.id
            )
            db.session.add(summary)
        
        # معالجة ملفات الأسئلة والإجابات إذا وجدت
        questions_file = request.files.get('questionsFile')
        answers_file = request.files.get('answersFile')
        
        if questions_file:
            questions_path = save_file(questions_file, 'question')
            question = Question(
                title=questions_title or 'أسئلة',
                file_path=questions_path,
                book_id=new_book.id
            )
            db.session.add(question)
            db.session.flush()  # للحصول على ID قبل الالتزام النهائي
            
            # إضافة الإجابات إذا وجدت
            if answers_file:
                answers_path = save_file(answers_file, 'answer')
                answer = Answer(
                    file_path=answers_path,
                    book_id=new_book.id,
                    question_id=question.id
                )
                db.session.add(answer)
        
        db.session.commit()
        
        return jsonify({'success': True, 'bookId': new_book.id})
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/books/<int:book_id>', methods=['DELETE'])
def api_delete_book(book_id):
    """واجهة برمجة لحذف كتاب"""
    if 'user_id' not in session or session['role'] != 'admin':
        return jsonify({'success': False, 'message': 'غير مصرح لك بالوصول'})
    
    book = Book.query.get(book_id)
    if not book:
        return jsonify({'success': False, 'message': 'الكتاب غير موجود'})
    
    try:
        # حذف الملفات المرتبطة بالكتاب
        if book.file_path and not book.file_path.startswith('http'):
            delete_file(book.file_path)
        
        if book.image_path and not book.image_path.startswith('http'):
            delete_file(book.image_path)
        
        # حذف ملفات الملخصات
        for summary in book.summaries:
            delete_file(summary.file_path)
        
        # حذف ملفات الأسئلة والإجابات
        for question in book.questions:
            delete_file(question.file_path)
            if question.answer:
                delete_file(question.answer.file_path)
        
        # حذف الكتاب من قاعدة البيانات
        db.session.delete(book)
        db.session.commit()
        
        return jsonify({'success': True})
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/books/<int:book_id>/summaries', methods=['POST'])
def api_add_book_summary(book_id):
    """واجهة برمجة لإضافة ملخص جديد للكتاب"""
    if 'user_id' not in session or session['role'] != 'admin':
        return jsonify({'success': False, 'message': 'غير مصرح لك بالوصول'})
    
    book = Book.query.get(book_id)
    if not book:
        return jsonify({'success': False, 'message': 'الكتاب غير موجود'})
    
    try:
        title = request.form.get('title')
        summary_file = request.files.get('file')
        
        if not title or not summary_file:
            return jsonify({'success': False, 'message': 'يرجى ملء جميع الحقول المطلوبة'})
        
        file_path = save_file(summary_file, 'summary')
        
        summary = Summary(
            title=title,
            file_path=file_path,
            book_id=book_id
        )
        
        db.session.add(summary)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'summary': {
                'id': summary.id,
                'title': summary.title,
                'file': summary.file_path,
                'date': summary.created_at.isoformat()
            }
        })
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/books/<int:book_id>/questions', methods=['POST'])
def api_add_book_question(book_id):
    """واجهة برمجة لإضافة أسئلة وإجابات جديدة للكتاب"""
    if 'user_id' not in session or session['role'] != 'admin':
        return jsonify({'success': False, 'message': 'غير مصرح لك بالوصول'})
    
    book = Book.query.get(book_id)
    if not book:
        return jsonify({'success': False, 'message': 'الكتاب غير موجود'})
    
    try:
        title = request.form.get('title')
        question_file = request.files.get('file')
        answer_file = request.files.get('answerFile')
        
        if not title or not question_file:
            return jsonify({'success': False, 'message': 'يرجى ملء الحقول المطلوبة'})
        
        question_path = save_file(question_file, 'question')
        
        question = Question(
            title=title,
            file_path=question_path,
            book_id=book_id
        )
        
        db.session.add(question)
        db.session.flush()
        
        answer = None
        if answer_file:
            answer_path = save_file(answer_file, 'answer')
            answer = Answer(
                file_path=answer_path,
                book_id=book_id,
                question_id=question.id
            )
            db.session.add(answer)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'question': {
                'id': question.id,
                'title': question.title,
                'file': question.file_path,
                'date': question.created_at.isoformat(),
                'answerId': answer.id if answer else None,
                'answerFile': answer.file_path if answer else None
            }
        })
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/books/<int:book_id>/edit', methods=['POST'])
def api_edit_book(book_id):
    """واجهة برمجة لتعديل معلومات الكتاب"""
    if 'user_id' not in session or session['role'] != 'admin':
        return jsonify({'success': False, 'message': 'غير مصرح لك بالوصول'})
    
    book = Book.query.get(book_id)
    if not book:
        return jsonify({'success': False, 'message': 'الكتاب غير موجود'})
    
    try:
        data = request.get_json()
        book.title = data.get('title', book.title)
        book.author = data.get('author', book.author)
        book.description = data.get('description', book.description)
        
        db.session.commit()
        
        return jsonify({'success': True})
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)})

@app.route('/uploads/<path:filename>')
def serve_upload(filename):
    """خدمة الملفات المرفوعة"""
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    return send_file(f'static/uploads/{filename}')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)