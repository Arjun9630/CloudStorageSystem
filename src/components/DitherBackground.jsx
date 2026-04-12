import Dither from './Dither';
export default function DitherBackground() {
    return (<div style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}>
      <Dither waveColor={[0, 0.5, 1]} disableAnimation={false} enableMouseInteraction mouseRadius={0.3} colorNum={4} waveAmplitude={0.3} waveFrequency={3} waveSpeed={0.05}/>
    </div>);
}
