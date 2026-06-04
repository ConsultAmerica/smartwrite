type DiffPart = { text: string; changed: boolean };

export function diffWords(original: string, improved: string): { original: DiffPart[]; improved: DiffPart[] } {
  const a = original.trim().split(/(\s+)/);
  const b = improved.trim().split(/(\s+)/);
  const orig: DiffPart[] = [];
  const imp: DiffPart[] = [];

  let i = 0;
  let j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      orig.push({ text: a[i], changed: false });
      imp.push({ text: b[j], changed: false });
      i++;
      j++;
      continue;
    }

    const nextMatchInB = j < b.length ? a.indexOf(b[j], i) : -1;
    const nextMatchInA = i < a.length ? b.indexOf(a[i], j) : -1;

    if (nextMatchInB !== -1 && (nextMatchInA === -1 || nextMatchInB - i <= nextMatchInA - j)) {
      while (i < nextMatchInB) {
        orig.push({ text: a[i], changed: true });
        i++;
      }
    } else if (nextMatchInA !== -1) {
      while (j < nextMatchInA) {
        imp.push({ text: b[j], changed: true });
        j++;
      }
    } else {
      if (i < a.length) {
        orig.push({ text: a[i], changed: true });
        i++;
      }
      if (j < b.length) {
        imp.push({ text: b[j], changed: true });
        j++;
      }
    }
  }

  return { original: orig, improved: imp };
}

export function DiffText({ parts }: { parts: DiffPart[] }) {
  return (
    <>
      {parts.map((p, idx) =>
        p.changed ? (
          <mark key={idx} className="diff-changed">
            {p.text}
          </mark>
        ) : (
          <span key={idx}>{p.text}</span>
        )
      )}
    </>
  );
}
