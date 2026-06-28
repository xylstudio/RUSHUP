
async function checkUrl(url) {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    console.log(`URL: ${url}`);
    console.log(`Status: ${res.status} ${res.statusText}`);
  } catch (err) {
    console.error(`Error fetching ${url}:`, err.message);
  }
}

const urls = [
  "https://cdjbzyrflzckjgxbqjqb.supabase.co/storage/v1/object/public/work-reports/manual-reports/f0f7c298-fc8e-4547-a654-1a46d10b9b2d/d94e94f4-069c-4f5f-b2e6-75ed30a78428/before_1778316649299_axd0zwtirdj.png",
  "https://cdjbzyrflzckjgxbqjqb.supabase.co/storage/v1/object/public/work-reports/manual-reports/f0f7c298-fc8e-4547-a654-1a46d10b9b2d/d94e94f4-069c-4f5f-b2e6-75ed30a78428/after_1778316654690_ufm0pv6x83m.png"
];

async function run() {
  for (const url of urls) {
    await checkUrl(url);
  }
}

run();
