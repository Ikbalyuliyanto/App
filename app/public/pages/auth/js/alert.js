// Alert System for Ashanum Auth

function showAlert(message, type = 'info') {
    // Remove existing alerts
    const existingAlerts = document.querySelectorAll('.custom-alert');
    existingAlerts.forEach(alert => alert.remove());

    // Create alert element
    const alertDiv = document.createElement('div');
    alertDiv.className = `custom-alert custom-alert-${type}`;
    
    // Icon based on type
    let icon = '';
    switch(type) {
        case 'success':
            icon = '<i class="fas fa-check-circle"></i>';
            break;
        case 'error':
            icon = '<i class="fas fa-times-circle"></i>';
            break;
        case 'warning':
            icon = '<i class="fas fa-exclamation-triangle"></i>';
            break;
        default:
            icon = '<i class="fas fa-info-circle"></i>';
    }
    
    alertDiv.innerHTML = `
        ${icon}
        <span>${message}</span>
        <button class="alert-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Add to body
    document.body.appendChild(alertDiv);
    
    // Trigger animation
    setTimeout(() => alertDiv.classList.add('show'), 10);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        alertDiv.classList.remove('show');
        setTimeout(() => alertDiv.remove(), 300);
    }, 5000);
}

// Add CSS for alerts
const alertStyles = `
    .custom-alert {
        position: fixed;
        top: 20px;
        right: 20px;
        min-width: 300px;
        max-width: 500px;
        padding: 16px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        display: flex;
        align-items: center;
        gap: 12px;
        z-index: 9999;
        opacity: 0;
        transform: translateX(400px);
        transition: all 0.3s ease;
    }
    
    .custom-alert.show {
        opacity: 1;
        transform: translateX(0);
    }
    
    .custom-alert i:first-child {
        font-size: 20px;
        flex-shrink: 0;
    }
    
    .custom-alert span {
        flex: 1;
        font-size: 14px;
        line-height: 1.5;
    }
    
    .alert-close {
        background: transparent;
        border: none;
        cursor: pointer;
        padding: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: background 0.2s;
        flex-shrink: 0;
    }
    
    .alert-close:hover {
        background: rgba(0, 0, 0, 0.1);
    }
    
    .alert-close i {
        font-size: 14px;
    }
    
    .custom-alert-success {
        background: #4caf50;
        color: white;
    }
    
    .custom-alert-error {
        background: #f44336;
        color: white;
    }
    
    .custom-alert-warning {
        background: #ff9800;
        color: white;
    }
    
    .custom-alert-info {
        background: #2196f3;
        color: white;
    }
    
    @media (max-width: 480px) {
        .custom-alert {
            right: 10px;
            left: 10px;
            min-width: auto;
            max-width: none;
        }
    }
`;

// Inject styles
const styleSheet = document.createElement('style');
styleSheet.textContent = alertStyles;
document.head.appendChild(styleSheet);
