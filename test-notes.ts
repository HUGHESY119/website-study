fetch('http://localhost:3000/api/generate-notes', { 
  method: 'POST', 
  headers: { 'Content-Type': 'application/json' }, 
  body: JSON.stringify({ topic: 'test', textContent: '', format: 'standard' }) 
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
