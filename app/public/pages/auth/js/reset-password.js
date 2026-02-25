// Reset Password JavaScript
let currentStep = 1;
let timerInterval;
let timeLeft = 600; // 10 minutes in seconds
let resendCooldown = 60; // 60 seconds cooldown
let canResend = true;

// Step 1: Email Submit
async function handleEmailSubmit(event) {
    event.preventDefault();
    const email = document.getElementById('email').value.trim();

    if (!email) {
        showAlert('Email wajib diisi!', 'warning');
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
        });

        const data = await res.json();

        if (!res.ok) {
            showAlert(data.message || 'Gagal mengirim kode verifikasi.', 'error');
            return;
        }

        showAlert('Kode verifikasi telah dikirim ke email Anda!', 'success');
        document.getElementById('email-display').textContent = email;
        goToStep(2);
        startTimer();

    } catch (error) {
        console.error(error);
        showAlert('Terjadi kesalahan jaringan, silakan coba lagi.', 'error');
    }
}

// Step 2: Code Submit
async function handleCodeSubmit(event) {
    event.preventDefault();
    const code = getVerificationCode();
    const email = document.getElementById('email').value.trim();

    if (code.length !== 6) {
        showAlert('Kode verifikasi harus 6 digit!', 'warning');
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/api/auth/verify-code`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, code }),
        });

        const data = await res.json();

        if (!res.ok) {
            showAlert(data.message || 'Kode verifikasi tidak valid.', 'error');
            return;
        }

        showAlert('Kode verifikasi berhasil!', 'success');
        clearInterval(timerInterval);
        goToStep(3);

    } catch (error) {
        console.error(error);
        showAlert('Terjadi kesalahan jaringan, silakan coba lagi.', 'error');
    }
}

// Step 3: Password Submit
async function handlePasswordSubmit(event) {
    event.preventDefault();
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const email = document.getElementById('email').value.trim();
    const code = getVerificationCode();

    if (newPassword !== confirmPassword) {
        showAlert('Password tidak cocok!', 'warning');
        return;
    }

    if (!isPasswordValid(newPassword)) {
        showAlert('Password tidak memenuhi persyaratan!', 'warning');
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, code, newPassword }),
        });

        const data = await res.json();

        if (!res.ok) {
            showAlert(data.message || 'Gagal mereset password.', 'error');
            return;
        }

        showAlert('Password berhasil direset!', 'success');
        goToStep('success');

    } catch (error) {
        console.error(error);
        showAlert('Terjadi kesalahan jaringan, silakan coba lagi.', 'error');
    }
}

// Navigation
function goToStep(step) {
    document.querySelectorAll('.form-step').forEach(el => el.classList.remove('active'));
    
    if (step === 'success') {
        document.getElementById('step-success').classList.add('active');
        updateStepIndicator(3, true);
    } else {
        document.getElementById(`step${step}`).classList.add('active');
        currentStep = step;
        updateStepIndicator(step);
    }
}

function updateStepIndicator(step, completed = false) {
    // Reset all steps
    for (let i = 1; i <= 3; i++) {
        const stepEl = document.getElementById(`step${i}-indicator`);
        stepEl.classList.remove('active', 'completed');
        
        if (i < step) {
            stepEl.classList.add('completed');
        } else if (i === step) {
            if (completed) {
                stepEl.classList.add('completed');
            } else {
                stepEl.classList.add('active');
            }
        }
    }

    // Update lines
    for (let i = 1; i <= 2; i++) {
        const lineEl = document.getElementById(`line${i}`);
        if (i < step) {
            lineEl.classList.add('active');
        } else {
            lineEl.classList.remove('active');
        }
    }
}

// Verification Code Handling
function moveToNext(current, nextId) {
    if (current.value.length === 1 && nextId) {
        document.getElementById(nextId).focus();
    }
    checkCodeComplete();
}

function handleBackspace(event, current, prevId) {
    if (event.key === 'Backspace' && current.value.length === 0 && prevId) {
        document.getElementById(prevId).focus();
    }
}

function handleCodeComplete() {
    checkCodeComplete();
}

function checkCodeComplete() {
    const code = getVerificationCode();
    const verifyBtn = document.getElementById('verify-btn');
    verifyBtn.disabled = code.length !== 6;
}

function getVerificationCode() {
    let code = '';
    for (let i = 1; i <= 6; i++) {
        code += document.getElementById(`code${i}`).value;
    }
    return code;
}

function clearVerificationCode() {
    for (let i = 1; i <= 6; i++) {
        document.getElementById(`code${i}`).value = '';
    }
    document.getElementById('code1').focus();
    checkCodeComplete();
}

// Timer
function startTimer() {
    timeLeft = 600;
    updateTimerDisplay();
    
    timerInterval = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();
        
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            showAlert('Kode verifikasi telah kadaluarsa. Silakan kirim ulang.', 'warning');
        }
    }, 1000);
}

function updateTimerDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    document.getElementById('timer').textContent = 
        `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Resend Code
async function handleResendCode() {
    if (!canResend) return;

    const email = document.getElementById('email').value.trim();

    try {
        const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
        });

        const data = await res.json();

        if (!res.ok) {
            showAlert(data.message || 'Gagal mengirim ulang kode.', 'error');
            return;
        }

        showAlert('Kode verifikasi baru telah dikirim!', 'success');
        clearVerificationCode();
        startTimer();
        startResendCooldown();

    } catch (error) {
        console.error(error);
        showAlert('Terjadi kesalahan jaringan, silakan coba lagi.', 'error');
    }
}

function startResendCooldown() {
    canResend = false;
    const resendLink = document.getElementById('resend-link');
    resendLink.classList.add('disabled');
    let cooldown = resendCooldown;

    const cooldownInterval = setInterval(() => {
        resendLink.textContent = `Kirim ulang (${cooldown}s)`;
        cooldown--;

        if (cooldown < 0) {
            clearInterval(cooldownInterval);
            canResend = true;
            resendLink.classList.remove('disabled');
            resendLink.textContent = 'Kirim ulang';
        }
    }, 1000);
}

// Password Validation
function checkPasswordStrength() {
    const password = document.getElementById('new-password').value;
    const strengthFill = document.getElementById('strength-fill');
    const strengthText = document.getElementById('strength-text');

    let strength = 0;
    const checks = {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /[0-9]/.test(password),
        special: /[^A-Za-z0-9]/.test(password)
    };

    // Update requirements
    document.getElementById('req-length').classList.toggle('met', checks.length);
    document.getElementById('req-uppercase').classList.toggle('met', checks.uppercase);
    document.getElementById('req-lowercase').classList.toggle('met', checks.lowercase);
    document.getElementById('req-number').classList.toggle('met', checks.number);

    // Calculate strength
    if (checks.length) strength += 20;
    if (checks.uppercase) strength += 20;
    if (checks.lowercase) strength += 20;
    if (checks.number) strength += 20;
    if (checks.special) strength += 20;

    // Update UI
    strengthFill.style.width = strength + '%';

    if (strength <= 40) {
        strengthFill.style.background = '#f44336';
        strengthText.textContent = 'Lemah';
        strengthText.style.color = '#f44336';
    } else if (strength <= 60) {
        strengthFill.style.background = '#ff9800';
        strengthText.textContent = 'Sedang';
        strengthText.style.color = '#ff9800';
    } else if (strength <= 80) {
        strengthFill.style.background = '#2196f3';
        strengthText.textContent = 'Kuat';
        strengthText.style.color = '#2196f3';
    } else {
        strengthFill.style.background = '#4caf50';
        strengthText.textContent = 'Sangat Kuat';
        strengthText.style.color = '#4caf50';
    }
}

function checkPasswordMatch() {
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const resetBtn = document.getElementById('reset-btn');

    resetBtn.disabled = !isPasswordValid(newPassword) || newPassword !== confirmPassword;
}

function isPasswordValid(password) {
    return password.length >= 8 &&
           /[A-Z]/.test(password) &&
           /[a-z]/.test(password) &&
           /[0-9]/.test(password);
}

function goToLogin() {
    window.location.href = 'login.html';
}

// Focus first code input when step 2 is shown
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.target.id === 'step2' && mutation.target.classList.contains('active')) {
            setTimeout(() => document.getElementById('code1').focus(), 100);
        }
    });
});

document.querySelectorAll('.form-step').forEach(step => {
    observer.observe(step, { attributes: true, attributeFilter: ['class'] });
});
