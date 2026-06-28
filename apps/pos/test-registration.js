const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://apjfeqhyvxibykqtipep.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwamZlcWh5dnhpYnlrcXRpcGVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzMTg0ODQsImV4cCI6MjA3Nzg5NDQ4NH0.CNRYp_-zEMJhr1_acwQ4HDpO10sZHbcYUyPxv6KLx5M'
);

async function testRegistration() {
  console.log('🧪 Testing registration after schema fix...');
  
  const testEmail = 'testuser' + Date.now() + '@example.com';
  const testPassword = '123456';
  
  console.log('📧 Test email:', testEmail);
  
  try {
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          full_name: 'Test User Fix',
          role: 'customer'
        }
      }
    });
    
    if (error) {
      console.log('❌ Registration failed:', error.message);
      return;
    }
    
    if (data?.user) {
      console.log('✅ User created successfully!');
      console.log('User ID:', data.user.id);
      
      // Wait a moment for trigger to complete
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check profile creation
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();
        
      if (profileError) {
        console.log('❌ Profile check failed:', profileError.message);
      } else {
        console.log('✅ Profile created successfully!');
        console.log('Customer Code:', profile.customer_base_code);
        console.log('Display Name:', profile.display_name);
        console.log('Role:', profile.role);
      }
    }
  } catch (err) {
    console.log('❌ Unexpected error:', err.message);
  }
}

testRegistration();
