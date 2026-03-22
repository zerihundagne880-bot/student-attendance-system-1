import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, query, orderBy } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCFUbJNdd2QxuqMjTbzXL8uCnG-b53AeDM",
  authDomain: "new--attendance-system.firebaseapp.com",
  projectId: "new--attendance-system",
  storageBucket: "new--attendance-system.firebasestorage.app",
  messagingSenderId: "54319218302",
  appId: "1:54319218302:web:a4a6eb793c81f97a3be22f"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
let myChart = null;

// Navigation
window.showAdminLogin = () => { document.getElementById("student-section").style.display = "none"; document.getElementById("login-section").style.display = "block"; };
window.showStudentSection = () => { document.getElementById("login-section").style.display = "none"; document.getElementById("student-section").style.display = "block"; };

// 1. Submit Attendance (With Automatic Time)
window.submitAttendance = async () => {
    const name = document.getElementById("studentName").value.trim();
    const date = document.getElementById("attendanceDate").value;
    const btn = document.getElementById("submit-btn");

    if (!name || !date) { alert("Please fill name and date!"); return; }

    const now = new Date();
    const time = now.getHours() + ":" + now.getMinutes().toString().padStart(2, '0');

    btn.innerText = "Processing..."; btn.disabled = true;
    try {
        await addDoc(collection(db, "students"), { name, date, time, timestamp: now });
        alert(`Success! Recorded at ${time}`);
        document.getElementById("studentName").value = "";
    } catch (e) { alert("Error: " + e.message); }
    finally { btn.innerText = "Submit Attendance"; btn.disabled = false; }
};

// 2. Admin Login
window.handleLogin = async () => {
    const email = document.getElementById("emailInput").value;
    const pass = document.getElementById("passwordInput").value;
    try {
        await signInWithEmailAndPassword(auth, email, pass);
        document.getElementById("login-section").style.display = "none";
        document.getElementById("admin-dashboard").style.display = "block";
        window.fetchRecords();
    } catch (e) { alert("Login Failed!"); }
};

// 3. Fetch Records & Update Chart
window.fetchRecords = async () => {
    const list = document.getElementById("recordList");
    list.innerHTML = "Loading...";
    const q = query(collection(db, "students"), orderBy("timestamp", "desc"));
    const snapshot = await getDocs(q);
    
    const records = [];
    const dateCounts = {};

    list.innerHTML = "";
    snapshot.forEach((sDoc) => {
        const data = sDoc.data();
        records.push({ id: sDoc.id, ...data });
        
        // ግራፍ ለመስራት ዳታውን መቁጠር
        dateCounts[data.date] = (dateCounts[data.date] || 0) + 1;

        list.innerHTML += `
            <div class="record-item" data-name="${data.name.toLowerCase()}">
                <div><b>${data.name}</b><br><small>${data.date} | Time: ${data.time}</small></div>
                <button class="delete-btn" onclick="deleteEntry('${sDoc.id}')">Delete</button>
            </div>`;
    });
    updateChart(dateCounts);
};

// 4. Search Functionality
window.searchStudents = () => {
    const term = document.getElementById("searchInput").value.toLowerCase();
    const items = document.querySelectorAll(".record-item");
    items.forEach(item => {
        item.style.display = item.getAttribute("data-name").includes(term) ? "flex" : "none";
    });
};

// 5. Analytics Chart
function updateChart(dateCounts) {
    const ctx = document.getElementById('attendanceChart').getContext('2d');
    if (myChart) myChart.destroy();
    
    myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(dateCounts),
            datasets: [{
                label: 'Students per Day',
                data: Object.values(dateCounts),
                backgroundColor: '#3498db'
            }]
        },
        options: { responsive: true, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
    });
}

// 6. Excel Export
window.exportToExcel = async () => {
    const q = query(collection(db, "students"), orderBy("timestamp", "desc"));
    const snapshot = await getDocs(q);
    let csv = "Name,Date,Time\n";
    snapshot.forEach(doc => { csv += `"${doc.data().name}","${doc.data().date}","${doc.data().time}"\n`; });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "Attendance_Data.csv"; a.click();
};

window.deleteEntry = async (id) => { if(confirm("Delete?")) { await deleteDoc(doc(db, "students", id)); window.fetchRecords(); } };
