const KEYWORDS = [
  'ai', 'artificial intelligence', 'llm', 'gpt', 'machine learning', 'ml',
  'deep learning', 'neural', 'robotics', 'open source', 'github', 'ai agent',
  'inference', 'gpu', 'transformer', 'computer vision', 'generative ai',
  'developer tools', 'cybersecurity'
];

interface CandidateTopic {
  topic: string;
  sourceUrl: string;
  source: string;
}

function isRelevant(title: string): boolean {
  const lowercaseTitle = title.toLowerCase();
  return KEYWORDS.some(keyword => {
    if (keyword === 'ai' || keyword === 'ml') {
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      return regex.test(lowercaseTitle);
    }
    return lowercaseTitle.includes(keyword);
  });
}

export async function fromHackerNews(): Promise<CandidateTopic[]> {
  try {
    const response = await fetch(
      'https://hn.algolia.com/api/v1/search_by_date?tags=story&hitsPerPage=25',
      { signal: AbortSignal.timeout(5000) }
    );
    if (!response.ok) {
      return [];
    }
    const data = await response.json();
    if (!data || !Array.isArray(data.hits)) {
      return [];
    }

    const candidates: CandidateTopic[] = [];
    for (const hit of data.hits) {
      if (!hit.title) continue;
      if (isRelevant(hit.title)) {
        const url = hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`;
        candidates.push({
          topic: hit.title,
          sourceUrl: url,
          source: 'Hacker News'
        });
      }
    }
    return candidates;
  } catch (error) {
    console.error('[Discovery HN Error]', error);
    return [];
  }
}

export async function fromArxiv(): Promise<CandidateTopic[]> {
  try {
    const response = await fetch(
      'http://export.arxiv.org/api/query?search_query=cat:cs.AI+OR+cat:cs.LG&sortBy=submittedDate&sortOrder=descending&max_results=15',
      { signal: AbortSignal.timeout(5000) }
    );
    if (!response.ok) {
      return [];
    }
    const xml = await response.text();
    const entryMatches = xml.match(/<entry>([\s\S]*?)<\/entry>/g);
    if (!entryMatches) {
      return [];
    }

    const candidates: CandidateTopic[] = [];
    for (const entry of entryMatches) {
      const idMatch = entry.match(/<id>([\s\S]*?)<\/id>/);
      const titleMatch = entry.match(/<title>([\s\S]*?)<\/title>/);

      if (idMatch && titleMatch) {
        const url = idMatch[1].trim();
        let title = titleMatch[1].trim();
        title = title.replace(/\s+/g, ' '); // Clean newlines/extra spaces
        candidates.push({
          topic: title,
          sourceUrl: url,
          source: 'arXiv'
        });
      }
    }
    return candidates;
  } catch (error) {
    console.error('[Discovery arXiv Error]', error);
    return [];
  }
}

export async function discover(): Promise<CandidateTopic[]> {
  try {
    const results = await Promise.allSettled([
      fromHackerNews(),
      fromArxiv()
    ]);

    let merged: CandidateTopic[] = [];
    const hnResult = results[0];
    const arxivResult = results[1];

    const hnCandidates = hnResult.status === 'fulfilled' ? hnResult.value : [];
    const arxivCandidates = arxivResult.status === 'fulfilled' ? arxivResult.value : [];

    // Deduplicate and interleave results to prefer a reasonable mix
    const maxLength = Math.max(hnCandidates.length, arxivCandidates.length);
    const seenUrls = new Set<string>();

    for (let i = 0; i < maxLength; i++) {
      if (i < hnCandidates.length) {
        const item = hnCandidates[i];
        if (!seenUrls.has(item.sourceUrl)) {
          seenUrls.add(item.sourceUrl);
          merged.push(item);
        }
      }
      if (i < arxivCandidates.length) {
        const item = arxivCandidates[i];
        if (!seenUrls.has(item.sourceUrl)) {
          seenUrls.add(item.sourceUrl);
          merged.push(item);
        }
      }
    }

    return merged.slice(0, 8);
  } catch (error) {
    console.error('[Discovery Main Error]', error);
    return [];
  }
}
