import React from 'react';
import HeroSection from '../components/HeroSection';
import Section from '../components/Section';
import SongCard from '../components/cards/SongCard';
import ArtistCard from '../components/cards/ArtistCard';
import Footer from '../components/Footer';

const Home = () => {
  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <HeroSection />

      <Section title="Bài hát xu hướng">
        <SongCard title="Like I Need U" subtitle="keshi" />
        <SongCard title="MOOD (feat. iann dior)" subtitle="24kGoldn" />
        <SongCard title="At My Worst" subtitle="Pink Sweat$" />
        <SongCard title="tóc em như mây thu" subtitle="Vũ." />
        <SongCard title="STAY" subtitle="The Kid LAROI, Justin Bieber" />
        <SongCard title="Glimpse of Us" subtitle="Joji" />
      </Section>

      <Section title="Nghệ sĩ nổi bật">
        <ArtistCard name="Sơn Tùng M-TP" />
        <ArtistCard name="MCK" />
        <ArtistCard name="tlinh" />
        <ArtistCard name="Vũ." />
        <ArtistCard name="HIEUTHUHAI" />
        <ArtistCard name="Binz" />
      </Section>

      <Section title="Album nổi bật">
        <SongCard title="Một Vạn Năm" subtitle="Vũ." />
        <SongCard title="99%" subtitle="MCK" />
        <SongCard title="ái" subtitle="tlinh" />
        <SongCard title="Lofi Vibes" subtitle="Various Artists" />
        <SongCard title="Cong" subtitle="Tóc Tiên" />
        <SongCard title="KOSMIK" subtitle="SpaceSpeakers" />
      </Section>

      <Section title="Top 10 hôm nay">
        <SongCard title="Chúng Ta Của Hiện Tại" subtitle="Sơn Tùng M-TP" />
        <SongCard title="Chìm Sâu" subtitle="RPT MCK" />
        <SongCard title="nếu lúc đó" subtitle="tlinh" />
        <SongCard title="Bước Qua Nhau" subtitle="Vũ." />
        <SongCard title="Ngủ Một Mình" subtitle="HIEUTHUHAI" />
        <SongCard title="Waiting For You" subtitle="MONO" />
      </Section>

      <Section title="Radio nổi bật">
        <SongCard title="Lofi Chill" subtitle="Trạm dừng chân nhẹ nhàng" />
        <SongCard title="Pop Acoustic" subtitle="Giai điệu thư giãn" />
        <SongCard title="Vietnamese Indie" subtitle="Nhẹ nhàng sâu lắng" />
        <SongCard title="Night Drive" subtitle="Hành trình đêm" />
        <SongCard title="K-Pop Hits" subtitle="Sôi động cuối tuần" />
        <SongCard title="R&B Vibe" subtitle="Giai điệu lôi cuốn" />
      </Section>

      <Footer />
    </div>
  );
};

export default Home;
