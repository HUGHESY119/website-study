fetch('http://localhost:3000/api/generate-flashcards', { 
  method: 'POST', 
  headers: { 'Content-Type': 'application/json' }, 
  body: JSON.stringify({ topic: 'test', cardCount: 1, difficulty: 'beginner' }) 
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
