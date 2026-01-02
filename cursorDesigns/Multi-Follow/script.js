const numberOfCursors = 12;
const cursors = [];
const cursorContainer = document.getElementById('cursor-container');

// Initialize cursors
for (let i = 0; i < numberOfCursors; i++) {
    const div = document.createElement('div');
    div.classList.add('cursor-element');
    
    // Decreasing size: Start big, get smaller
    // e.g. 50 -> ... -> 20
    const size = 50 - (i * 2.5); 
    div.style.width = `${size}px`;
    div.style.height = `${size}px`;
    
    // Initial z-index to ensure correct layering
    div.style.zIndex = numberOfCursors - i;

    // Append to the container for the filter to work on them as a group
    cursorContainer.appendChild(div);
    
    cursors.push({
        element: div,
        x: window.innerWidth / 2,
        y: window.innerHeight / 2
    });
}

let mouseX = window.innerWidth / 2;
let mouseY = window.innerHeight / 2;

document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
});

// Animation loop
function animate() {
    let targetX = mouseX;
    let targetY = mouseY;

    cursors.forEach((cursor, index) => {
        // Each cursor follows the target (which is either mouse or previous cursor)
        // Using a simple lerp for smooth following
        
        const dx = targetX - cursor.x;
        const dy = targetY - cursor.y;
        
        // Speed factor: 
        // We can vary speed or keep it constant. 
        // Lowering the speed creates a more viscous, fluid feeling (less rubberband).
        const speed = 0.12; 
        
        cursor.x += dx * speed;
        cursor.y += dy * speed;

        cursor.element.style.left = `${cursor.x}px`;
        cursor.element.style.top = `${cursor.y}px`;

        // The next cursor will target THIS cursor's current position
        targetX = cursor.x;
        targetY = cursor.y;
    });

    requestAnimationFrame(animate);
}

animate();
