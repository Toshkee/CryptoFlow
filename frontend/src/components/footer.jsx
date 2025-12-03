import "./footer.css";

export default function Footer() {
  return (
    <footer className="footer">
      <p>© {new Date().getFullYear()} CryptoFlow — All Rights Reserved.</p>
    </footer>
  );
}