const bcrypt = require('bcrypt');

async function hashPassword() {
    const saltRounds = 10;
    const adminPassword = 'admin123';
    const employeePassword = 'employee123';
    
    const adminHash = await bcrypt.hash(adminPassword, saltRounds);
    const employeeHash = await bcrypt.hash(employeePassword, saltRounds);
    
    console.log('Admin password (admin123) hash:', adminHash);
    console.log('Employee password (employee123) hash:', employeeHash);
}

hashPassword();
