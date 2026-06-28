
@echo off
set "PATH=C:\Program Files\nodejs\;C:\Users\localadmin\AppData\Roaming\npm\;%PATH%"
echo Deleting...
vercel env rm NEXT_PUBLIC_SUPABASE_ANON_KEY production --yes
vercel env rm SUPABASE_SERVICE_ROLE_KEY production --yes
vercel env rm NEXT_PUBLIC_LIFF_ID production --yes
vercel env rm NEXT_PUBLIC_APP_URL production --yes
vercel env rm LINE_CHANNEL_ACCESS_TOKEN production --yes
vercel env rm LINE_CHANNEL_ID production --yes
vercel env rm LINE_CHANNEL_SECRET production --yes
vercel env rm NEXT_PUBLIC_GOOGLE_MAPS_API_KEY production --yes

echo Adding...
(echo eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkamJ6eXJmbHpja2pneGJxanFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2NTk3OTgsImV4cCI6MjA4NzIzNTc5OH0.kBFsmHTZuhWheVnX1rXL26BL0kIBka-DE__648Aue18) | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
(echo eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkamJ6eXJmbHpja2pneGJxanFiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTY1OTc5OCwiZXhwIjoyMDg3MjM1Nzk4fQ.17vCilrLI2O543l4S6lVLB18Dulc7QkuMFENrxoIBQs) | vercel env add SUPABASE_SERVICE_ROLE_KEY production
(echo 2009322178-2dtfXAvi) | vercel env add NEXT_PUBLIC_LIFF_ID production
(echo https://xylem-landscape.vercel.app) | vercel env add NEXT_PUBLIC_APP_URL production
(echo MAePgqwn0aNtuRtgs1q//MoW7vwbHsD1F6rYfUgiLdKMNRLD+9APlSGQlur1ee/+wQ60MIA7MglgA3jnqAvkvfiBlLv/t85pb/RjEsjZLj2CVwjvFaO5t/0iIYaXPugD2U6KMwC1nzDEsM2ukbudXgdB04t89/1O/w1cDnyilFU=) | vercel env add LINE_CHANNEL_ACCESS_TOKEN production
(echo 2009322178) | vercel env add LINE_CHANNEL_ID production
(echo c85ef3c5cd84118536ba57136a5038e4) | vercel env add LINE_CHANNEL_SECRET production
(echo AIzaSyC_WyXOPRZkYXyA3wcmeMS6t7l2WhA-ajA) | vercel env add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY production
