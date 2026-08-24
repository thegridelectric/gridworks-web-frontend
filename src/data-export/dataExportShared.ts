export const CHANNEL_SECTIONS: { title: string; items: { id: string; label: string }[] }[] = [
  {
    title: 'Heat pump',
    items: [
      { id: 'hp-lwt', label: 'Leaving water temperature' },
      { id: 'hp-ewt', label: 'Entering water temperature' },
      { id: 'hp-odu-pwr', label: 'Outdoor unit power' },
      { id: 'hp-idu-pwr', label: 'Indoor unit power' },
      { id: 'primary-flow', label: 'Primary pump flow rate' },
      { id: 'primary-pump-pwr', label: 'Primary pump power' },
      { id: 'primary-010v', label: 'Primary pump 0-10V' },
    ],
  },
  {
    title: 'Distribution',
    items: [
      { id: 'dist-swt', label: 'Source water temperature' },
      { id: 'dist-rwt', label: 'Return water temperature' },
      { id: 'dist-flow', label: 'Distribution pump flow rate' },
      { id: 'dist-pump-pwr', label: 'Distribution pump power' },
      { id: 'dist-010v', label: 'Distribution pump 0-10V' },
    ],
  },
  {
    title: 'Zones',
    items: [
      { id: 'zone-heat-calls', label: 'Heat calls' },
      { id: 'white-wires', label: 'White wire power' },
    ],
  },
  {
    title: 'Buffer',
    items: [
      { id: 'buffer-depths', label: 'Buffer depths' },
      { id: 'buffer-hot-pipe', label: 'Buffer hot pipe' },
      { id: 'buffer-cold-pipe', label: 'Buffer cold pipe' },
    ],
  },
  {
    title: 'Storage',
    items: [
      { id: 'storage-depths', label: 'Storage depths' },
      { id: 'store-hot-pipe', label: 'Storage hot pipe' },
      { id: 'store-cold-pipe', label: 'Storage cold pipe' },
      { id: 'store-flow', label: 'Storage pump flow rate' },
      { id: 'store-pump-pwr', label: 'Storage pump power' },
      { id: 'storage-010v', label: 'Storage pump 0-10V' },
    ],
  },
  {
    title: 'Other',
    items: [
      { id: 'oil-boiler-pwr', label: 'Oil boiler power' },
      { id: 'oat', label: 'Outside air temperature' },
      { id: 'relays', label: 'Relays' },
      { id: 'all-data', label: 'All other channels' },
    ],
  },
];

export const ALL_CHANNEL_IDS = new Set(CHANNEL_SECTIONS.flatMap((s) => s.items.map((i) => i.id)));

export function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
