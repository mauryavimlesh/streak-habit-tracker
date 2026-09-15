fetch('http://localhost:3000/api/ai-coach', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: "Hello coach" })
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
