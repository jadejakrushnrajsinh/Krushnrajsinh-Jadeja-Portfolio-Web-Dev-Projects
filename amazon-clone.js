// Enhanced cart functionality
let cartCount = 0;
const cartCountElement = document.getElementById('cart-count');
const addToCartButtons = document.querySelectorAll('.add-to-cart');

// Initialize with some cart items
updateCartCount(2);

addToCartButtons.forEach(button => {
    button.addEventListener('click', () => {
        updateCartCount(cartCount + 1);

        // Visual feedback
        button.innerHTML = 'Added!';
        button.style.backgroundColor = '#34a853';

        setTimeout(() => {
            button.innerHTML = 'Add to Cart';
            button.style.backgroundColor = '#ffd814';
        }, 1500);
    });
});

function updateCartCount(count) {
    cartCount = count;
    cartCountElement.textContent = cartCount;

    // Add animation for cart count
    cartCountElement.classList.add('pulse');
    setTimeout(() => {
        cartCountElement.classList.remove('pulse');
    }, 300);
}

// Add animation for cart count
const style = document.createElement('style');
style.textContent = `
    .pulse {
        animation: pulse 0.3s ease-in-out;
    }

    @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.3); }
        100% { transform: scale(1); }
    }
`;
document.head.appendChild(style);
