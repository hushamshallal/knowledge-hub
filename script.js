// المتغيرات العامة
let currentUser = null;
let books = [];
let users = [];

// تهيئة التطبيق
document.addEventListener('DOMContentLoaded', function() {
    try {
        console.log('تم تحميل الصفحة');
        
        // تحديد الصفحة الحالية
        const path = window.location.pathname;
        const isLoginPage = path.includes('login.html') || path.endsWith('login') || path === '/';
        
        console.log('المسار الحالي:', path);
        console.log('صفحة تسجيل الدخول؟', isLoginPage);
        
        if (isLoginPage) {
            // نحن في صفحة تسجيل الدخول
            console.log('جاري إعداد صفحة تسجيل الدخول...');
            setupLoginPage();
        } else {
            // نحن في الصفحة الرئيسية
            console.log('جاري إعداد الصفحة الرئيسية...');
            initApp();
        }
    } catch (error) {
        console.error('خطأ عند تحميل التطبيق:', error);
        alert('حدث خطأ أثناء تحميل الصفحة: ' + error.message);
    }
});

// وظيفة تهيئة التطبيق
function initApp() {
    try {
        // عرض حالة التحميل
        showLoading();
        console.log('جاري عرض حالة التحميل...');

        // التحقق من تسجيل الدخول
        try {
            currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
            console.log('المستخدم الحالي:', currentUser);
        } catch (error) {
            console.error('خطأ في قراءة بيانات المستخدم:', error);
            currentUser = null;
        }
        
        if (!currentUser) {
            console.log('لم يتم تسجيل الدخول، جاري التوجيه إلى صفحة تسجيل الدخول...');
            // إذا لم يكن المستخدم مسجل، التوجه لصفحة تسجيل الدخول
            window.location.href = 'login.html';
            return;
        }

        // تحميل بيانات الكتب والمستخدمين
        loadBooks();
        loadUsers();

        // إعداد معلومات المستخدم في الهيدر
        updateUserInfo();

        // إعداد أحداث الأزرار
        setupEventListeners();

        // إخفاء حالة التحميل
        hideLoading();
        console.log('تم تهيئة التطبيق بنجاح');
    } catch (error) {
        console.error('خطأ في تهيئة التطبيق:', error);
        hideLoading();
        alert('حدث خطأ أثناء تهيئة التطبيق: ' + error.message);
    }
}

// إظهار وإخفاء حالة التحميل
function showLoading() {
    try {
        const loadingContainer = document.querySelector('.loading-container');
        if (loadingContainer) {
            loadingContainer.style.display = 'flex';
        }
    } catch (error) {
        console.error('خطأ في إظهار حالة التحميل:', error);
    }
}

function hideLoading() {
    try {
        const loadingContainer = document.querySelector('.loading-container');
        if (loadingContainer) {
            loadingContainer.style.display = 'none';
        }
    } catch (error) {
        console.error('خطأ في إخفاء حالة التحميل:', error);
    }
}

// تحديث معلومات المستخدم في الهيدر
function updateUserInfo() {
    try {
        const usernameElement = document.getElementById('username');
        const userRoleElement = document.getElementById('userRole');
        
        console.log('عناصر معلومات المستخدم:', { usernameElement, userRoleElement });
        
        if (usernameElement && currentUser) {
            usernameElement.textContent = currentUser.username;
        }
        
        if (userRoleElement && currentUser) {
            userRoleElement.textContent = currentUser.role === 'admin' ? 'مسؤول' : 'طالب';
        }

        // إظهار/إخفاء زر عرض المستخدمين حسب صلاحيات المستخدم
        const viewUsersBtn = document.getElementById('viewUsersBtn');
        if (viewUsersBtn) {
            viewUsersBtn.style.display = currentUser.role === 'admin' ? 'inline-flex' : 'none';
        }
    } catch (error) {
        console.error('خطأ في تحديث معلومات المستخدم:', error);
    }
}

// إعداد أحداث الأزرار والنماذج
function setupEventListeners() {
    try {
        // زر تسجيل الخروج
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', logout);
            console.log('تم إعداد زر تسجيل الخروج');
        }

        // زر إضافة كتاب
        const addBookBtn = document.getElementById('addBookBtn');
        if (addBookBtn) {
            addBookBtn.addEventListener('click', function() {
                document.getElementById('addBookModal').style.display = 'block';
            });
            console.log('تم إعداد زر إضافة كتاب');
        }

        // زر عرض المستخدمين (للمسؤولين فقط)
        const viewUsersBtn = document.getElementById('viewUsersBtn');
        if (viewUsersBtn) {
            viewUsersBtn.addEventListener('click', function() {
                document.getElementById('usersModal').style.display = 'block';
                displayUsers();
            });
            console.log('تم إعداد زر عرض المستخدمين');
        }

        // أزرار إغلاق النوافذ المنبثقة
        const closeButtons = document.querySelectorAll('.close-modal');
        closeButtons.forEach(button => {
            button.addEventListener('click', function() {
                this.closest('.modal').style.display = 'none';
            });
        });
        console.log('تم إعداد أزرار الإغلاق');

        // نموذج إضافة كتاب
        const addBookForm = document.getElementById('addBookForm');
        if (addBookForm) {
            addBookForm.addEventListener('submit', handleAddBook);
            console.log('تم إعداد نموذج إضافة كتاب');
        }

        // حقل البحث
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', function() {
                filterBooks(this.value);
            });
            console.log('تم إعداد حقل البحث');
        }

        // إغلاق النوافذ المنبثقة عند النقر خارجها
        window.addEventListener('click', function(event) {
            const modals = document.querySelectorAll('.modal');
            modals.forEach(modal => {
                if (event.target === modal) {
                    modal.style.display = 'none';
                }
            });
        });
        console.log('تم إعداد جميع الأحداث');
    } catch (error) {
        console.error('خطأ في إعداد الأحداث:', error);
    }
}

// تسجيل الخروج
function logout() {
    try {
        localStorage.removeItem('currentUser');
        window.location.href = 'login.html';
    } catch (error) {
        console.error('خطأ في تسجيل الخروج:', error);
        alert('حدث خطأ أثناء تسجيل الخروج.');
    }
}

// تحميل بيانات الكتب
function loadBooks() {
    try {
        const storedBooks = localStorage.getItem('books');
        books = storedBooks ? JSON.parse(storedBooks) : [];
        console.log('تم تحميل', books.length, 'كتاب');
        displayBooks(books);
    } catch (error) {
        console.error('خطأ في تحميل الكتب:', error);
        books = [];
        displayBooks([]);
    }
}

// تحميل بيانات المستخدمين
function loadUsers() {
    try {
        const storedUsers = localStorage.getItem('users');
        users = storedUsers ? JSON.parse(storedUsers) : [];
        console.log('تم تحميل', users.length, 'مستخدم');
    } catch (error) {
        console.error('خطأ في تحميل المستخدمين:', error);
        users = [];
    }
}

// عرض الكتب في الصفحة
function displayBooks(booksToDisplay) {
    const booksContainer = document.getElementById('booksContainer');
    if (!booksContainer) return;

    booksContainer.innerHTML = '';

    if (booksToDisplay.length === 0) {
        booksContainer.innerHTML = '<div class="no-books">لا توجد كتب متاحة حالياً</div>';
        return;
    }

    booksToDisplay.forEach(book => {
        const bookCard = document.createElement('div');
        bookCard.className = 'book-card';
        
        let bookImage = book.image ? book.image : 'https://via.placeholder.com/150?text=No+Image';
        
        bookCard.innerHTML = `
            <div class="book-image">
                <img src="${bookImage}" alt="${book.title}">
            </div>
            <div class="book-details">
                <h3 class="book-title">${book.title}</h3>
                <p class="book-author">المؤلف: ${book.author}</p>
                <p class="book-description">${book.description || 'لا يوجد وصف'}</p>
                <div class="book-actions">
                    <button class="btn btn-primary download-btn" data-id="${book.id}">
                        <i class="fas fa-download"></i> تحميل
                    </button>
                    ${currentUser.role === 'admin' ? 
                      `<button class="btn btn-danger delete-btn" data-id="${book.id}">
                          <i class="fas fa-trash"></i> حذف
                       </button>` : ''}
                </div>
            </div>
        `;

        // إضافة حدث للتحميل
        const downloadBtn = bookCard.querySelector('.download-btn');
        downloadBtn.addEventListener('click', function() {
            downloadBook(book);
        });

        // إضافة حدث للحذف (للمسؤولين فقط)
        if (currentUser.role === 'admin') {
            const deleteBtn = bookCard.querySelector('.delete-btn');
            deleteBtn.addEventListener('click', function() {
                if (confirm('هل أنت متأكد من حذف هذا الكتاب؟')) {
                    deleteBook(book.id);
                }
            });
        }

        booksContainer.appendChild(bookCard);
    });
}

// تصفية الكتب حسب البحث
function filterBooks(query) {
    if (!query) {
        displayBooks(books);
        return;
    }

    query = query.toLowerCase();
    const filtered = books.filter(book => 
        book.title.toLowerCase().includes(query) || 
        book.author.toLowerCase().includes(query) ||
        (book.description && book.description.toLowerCase().includes(query))
    );
    
    displayBooks(filtered);
}

// إضافة كتاب جديد
function handleAddBook(event) {
    event.preventDefault();
    
    const title = document.getElementById('bookTitle').value;
    const author = document.getElementById('bookAuthor').value;
    const description = document.getElementById('bookDescription').value;
    const fileInput = document.getElementById('bookFile');
    const imageInput = document.getElementById('bookImage');
    
    if (!title || !author || !fileInput.files[0]) {
        alert('يرجى ملء جميع الحقول المطلوبة');
        return;
    }
    
    showLoading();
    
    // قراءة الملف كـ base64
    const fileReader = new FileReader();
    fileReader.readAsDataURL(fileInput.files[0]);
    
    fileReader.onload = function() {
        const fileData = fileReader.result;
        
        // إذا تم رفع صورة، قراءتها أيضاً
        if (imageInput.files[0]) {
            const imageReader = new FileReader();
            imageReader.readAsDataURL(imageInput.files[0]);
            
            imageReader.onload = function() {
                addBook(title, author, description, fileData, imageReader.result);
            };
        } else {
            addBook(title, author, description, fileData);
        }
    };
}

// إضافة كتاب جديد إلى المصفوفة والمخزن المحلي
function addBook(title, author, description, fileData, imageData = null) {
    try {
        const newBook = {
            id: Date.now().toString(),
            title: title,
            author: author,
            description: description,
            file: fileData,
            image: imageData,
            addedBy: currentUser.username,
            addedDate: new Date().toISOString()
        };
        
        books.push(newBook);
        localStorage.setItem('books', JSON.stringify(books));
        
        // إعادة ضبط نموذج إضافة الكتاب
        document.getElementById('addBookForm').reset();
        document.getElementById('addBookModal').style.display = 'none';
        
        // تحديث عرض الكتب
        displayBooks(books);
        
        alert('تمت إضافة الكتاب بنجاح');
    } catch (error) {
        console.error('خطأ في إضافة الكتاب:', error);
        alert('حدث خطأ أثناء إضافة الكتاب: ' + error.message);
    } finally {
        hideLoading();
    }
}

// حذف كتاب
function deleteBook(bookId) {
    try {
        showLoading();
        
        const bookIndex = books.findIndex(book => book.id === bookId);
        if (bookIndex !== -1) {
            books.splice(bookIndex, 1);
            localStorage.setItem('books', JSON.stringify(books));
            displayBooks(books);
            alert('تم حذف الكتاب بنجاح');
        }
    } catch (error) {
        console.error('خطأ في حذف الكتاب:', error);
        alert('حدث خطأ أثناء حذف الكتاب');
    } finally {
        hideLoading();
    }
}

// تحميل كتاب
function downloadBook(book) {
    try {
        // إنشاء رابط مؤقت لتحميل الملف
        const link = document.createElement('a');
        link.href = book.file;
        link.download = `${book.title}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (error) {
        console.error('خطأ في تحميل الكتاب:', error);
        alert('حدث خطأ أثناء تحميل الكتاب');
    }
}

// عرض المستخدمين (للمسؤولين فقط)
function displayUsers() {
    const usersList = document.getElementById('usersList');
    if (!usersList) return;
    
    usersList.innerHTML = '';
    
    if (users.length === 0) {
        usersList.innerHTML = '<div class="no-users">لا يوجد مستخدمين مسجلين حالياً</div>';
        return;
    }
    
    users.forEach(user => {
        const userItem = document.createElement('div');
        userItem.className = 'user-item';
        
        userItem.innerHTML = `
            <div class="user-info">
                <span class="user-name">${user.username}</span>
            </div>
            <span class="user-type ${user.role}">${user.role === 'admin' ? 'مسؤول' : 'طالب'}</span>
        `;
        
        usersList.appendChild(userItem);
    });
}

// إعداد صفحة تسجيل الدخول
function setupLoginPage() {
    try {
        // إنشاء بيانات المستخدمين التجريبية إذا لم تكن موجودة
        initializeUsers();

        // إعداد تبديل التبويبات في صفحة تسجيل الدخول
        const tabs = document.querySelectorAll('.login-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', function() {
                // إزالة الفئة النشطة من جميع التبويبات
                tabs.forEach(t => t.classList.remove('active'));
                
                // إضافة الفئة النشطة للتبويب المحدد
                this.classList.add('active');
                
                // إخفاء جميع النماذج
                document.querySelectorAll('.login-form').forEach(form => {
                    form.classList.remove('active');
                });
                
                // إظهار النموذج المرتبط بالتبويب المحدد
                const tabName = this.getAttribute('data-tab');
                document.getElementById(tabName + 'Form').classList.add('active');
                
                // مسح رسائل الخطأ
                document.querySelectorAll('.form-error').forEach(err => {
                    err.style.display = 'none';
                });
            });
        });

        // إعداد نموذج تسجيل الدخول
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', function(event) {
                event.preventDefault();
                
                const username = document.getElementById('username').value;
                const password = document.getElementById('password').value;
                
                if (!username || !password) {
                    showLoginError('يرجى ملء جميع الحقول المطلوبة');
                    return;
                }
                
                loginUser(username, password);
            });
            console.log('تم إعداد نموذج تسجيل الدخول');
        }

        // إعداد نموذج إنشاء حساب
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', function(event) {
                event.preventDefault();
                
                const username = document.getElementById('regUsername').value;
                const password = document.getElementById('regPassword').value;
                const confirmPassword = document.getElementById('confirmPassword').value;
                const userRole = document.querySelector('input[name="userRole"]:checked').value;
                
                if (!username || !password || !confirmPassword) {
                    showRegisterError('يرجى ملء جميع الحقول المطلوبة');
                    return;
                }
                
                if (password !== confirmPassword) {
                    showRegisterError('كلمات المرور غير متطابقة');
                    return;
                }
                
                registerUser(username, password, userRole);
            });
            console.log('تم إعداد نموذج إنشاء حساب');
        }

        hideLoading();
    } catch (error) {
        console.error('خطأ في إعداد صفحة تسجيل الدخول:', error);
        hideLoading();
        alert('حدث خطأ أثناء إعداد صفحة تسجيل الدخول: ' + error.message);
    }
}

// إنشاء بيانات المستخدمين التجريبية إذا لم تكن موجودة
function initializeUsers() {
    try {
        const storedUsers = localStorage.getItem('users');
        if (!storedUsers) {
            // إنشاء مستخدم افتراضي
            const defaultUsers = [
                {
                    id: '1',
                    username: 'admin',
                    password: 'admin123',
                    role: 'admin'
                },
                {
                    id: '2',
                    username: 'student',
                    password: 'student123',
                    role: 'student'
                }
            ];
            
            localStorage.setItem('users', JSON.stringify(defaultUsers));
            console.log('تم إنشاء المستخدمين الافتراضيين');
        }
        
        // تحميل المستخدمين
        users = JSON.parse(localStorage.getItem('users') || '[]');
        console.log('تم تحميل', users.length, 'مستخدم');
    } catch (error) {
        console.error('خطأ في تهيئة المستخدمين:', error);
    }
}

// عرض خطأ تسجيل الدخول
function showLoginError(message) {
    const loginError = document.getElementById('loginError');
    if (loginError) {
        loginError.textContent = message;
        loginError.style.display = 'block';
    }
}

// عرض خطأ إنشاء حساب
function showRegisterError(message) {
    const registerError = document.getElementById('registerError');
    if (registerError) {
        registerError.textContent = message;
        registerError.style.display = 'block';
    }
}

// تسجيل الدخول
function loginUser(username, password) {
    try {
        showLoading();
        
        const user = users.find(u => 
            u.username === username && u.password === password
        );
        
        if (user) {
            // حفظ معلومات المستخدم في المخزن المحلي
            currentUser = {
                id: user.id,
                username: user.username,
                role: user.role
            };
            
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            // التوجه للصفحة الرئيسية
            window.location.href = 'index.html';
        } else {
            hideLoading();
            showLoginError('اسم المستخدم أو كلمة المرور غير صحيحة');
        }
    } catch (error) {
        console.error('خطأ في تسجيل الدخول:', error);
        hideLoading();
        showLoginError('حدث خطأ أثناء تسجيل الدخول');
    }
}

// إنشاء حساب جديد
function registerUser(username, password, role) {
    try {
        showLoading();
        
        // التحقق من عدم وجود نفس اسم المستخدم
        const existingUser = users.find(u => u.username === username);
        if (existingUser) {
            hideLoading();
            showRegisterError('اسم المستخدم موجود بالفعل');
            return;
        }
        
        // إنشاء مستخدم جديد
        const newUser = {
            id: Date.now().toString(),
            username: username,
            password: password,
            role: role
        };
        
        // إضافة المستخدم إلى المصفوفة والمخزن المحلي
        users.push(newUser);
        localStorage.setItem('users', JSON.stringify(users));
        
        // تسجيل دخول المستخدم الجديد
        currentUser = {
            id: newUser.id,
            username: newUser.username,
            role: newUser.role
        };
        
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        
        // التوجه للصفحة الرئيسية
        window.location.href = 'index.html';
    } catch (error) {
        console.error('خطأ في إنشاء حساب:', error);
        hideLoading();
        showRegisterError('حدث خطأ أثناء إنشاء الحساب');
    }
}
