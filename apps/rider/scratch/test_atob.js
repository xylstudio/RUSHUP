try {
  atob("a");
} catch(e) {
  console.log(e.name, e.message);
}
