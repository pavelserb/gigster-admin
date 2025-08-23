const bcrypt = require('bcrypt');

async function generatePasswordHash() {
  const password = 'admin123';
  const hash = await bcrypt.hash(password, 10);
  
  console.log('Password:', password);
  console.log('Hash:', hash);
  
  // Проверяем, что хеш работает
  const isValid = await bcrypt.compare(password, hash);
  console.log('Hash is valid:', isValid);
}

generatePasswordHash();
