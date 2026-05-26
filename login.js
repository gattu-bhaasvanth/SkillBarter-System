class LoginSystem {
    constructor() {
        this.checkAuthState();
        this.init();
    }

    init() {
        this.setupTabs();
        this.setupForms();
    }

    checkAuthState() {
        auth.onAuthStateChanged((user) => {
            if (user) {
                document.body.classList.add('fade-out');
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 600);
            }
        });
    }

    setupTabs() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
                
                e.target.classList.add('active');
                const formId = e.target.id === 'loginTab' ? 'loginForm' : 'signupForm';
                document.getElementById(formId).classList.add('active');
            });
        });
    }

    setupForms() {
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        document.getElementById('signupForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSignup();
        });
    }

    async handleLogin() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const btn = document.getElementById('loginBtn');

        btn.textContent = 'Logging in...';
        btn.disabled = true;

        try {
            await auth.signInWithEmailAndPassword(email, password);
            document.body.classList.add('fade-out');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 600);
        } catch (error) {
            console.error('Login error:', error);
            alert(this.getErrorMessage(error.code));
            btn.textContent = 'Login';
            btn.disabled = false;
        }
    }

    async handleSignup() {
        const name = document.getElementById('signupName').value;
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;
        const btn = document.getElementById('signupBtn');

        if (password.length < 6) {
            alert('Password must be at least 6 characters');
            return;
        }

        btn.textContent = 'Creating account...';
        btn.disabled = true;

        try {
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;

            await db.collection('users').doc(user.uid).set({
                uid: user.uid,
                name: name,
                email: email,
                skillsOffered: [],
                skillsWanted: [],
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            document.body.classList.add('fade-out');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 600);
        } catch (error) {
            console.error('Signup error:', error);
            alert(this.getErrorMessage(error.code));
            btn.textContent = 'Sign Up';
            btn.disabled = false;
        }
    }

    getErrorMessage(code) {
        const errors = {
            'auth/email-already-in-use': 'Email already registered',
            'auth/invalid-email': 'Invalid email address',
            'auth/user-not-found': 'User not found',
            'auth/wrong-password': 'Incorrect password',
            'auth/weak-password': 'Password too weak',
            'auth/network-request-failed': 'Network error. Check connection',
            'auth/invalid-credential': 'Invalid email or password',
            'auth/too-many-requests': 'Too many attempts. Try again later'
        };
        return errors[code] || `Error: ${code || 'Unknown error'}`;
    }
}

new LoginSystem();