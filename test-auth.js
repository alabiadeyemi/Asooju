import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Missing Supabase environment variables.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const testEmail = `test_${Math.random().toString(36).substring(7)}@example.com`;
const testPassword = 'Password123!';

async function testAuth() {
    console.log(`Checking if server is reachable and testing Auth API...`);

    // 1. Test Signup
    console.log(`Step 1: Testing Signup for ${testEmail}...`);
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: testEmail,
        password: testPassword,
        options: {
            data: {
                first_name: 'Anti',
                last_name: 'Gravity'
            }
        }
    });

    if (signUpError) {
        console.error(`Signup Failed: ${signUpError.message}`);
        process.exit(1);
    }
    console.log(`Signup Successful! User ID: ${signUpData.user?.id}`);

    // 2. Test Login
    console.log(`Step 2: Testing Login...`);
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword
    });

    if (loginError) {
        console.error(`Login Failed: ${loginError.message}`);
        process.exit(1);
    }
    console.log(`Login Successful! Session active for: ${loginData.user?.email}`);

    // 3. Test Logout
    console.log(`Step 3: Testing Logout...`);
    const { error: logoutError } = await supabase.auth.signOut();
    if (logoutError) {
        console.error(`Logout Failed: ${logoutError.message}`);
        process.exit(1);
    }
    console.log(`Logout Successful!`);

    console.log(`--- AUTH ENGINE VERIFIED ---`);
    process.exit(0);
}

testAuth();
