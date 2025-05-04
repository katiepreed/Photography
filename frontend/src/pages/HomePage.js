import Gallery from "../components/Gallery";

function HomePage({ refreshTrigger }) {
  return (
    <div>
      <Gallery refreshTrigger={refreshTrigger} />
    </div>
  );
}

export default HomePage;
