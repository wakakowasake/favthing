const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require('firebase-functions/params');
const express = require("express");
const cors = require("cors");

const app = express();

// CORS 설정
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json());

// Health check 엔드포인트
app.get("/health", (req, res) => {
  res.json({ status: "OK" });
});

// KMDB API 영화 검색 (프록시) - 한국 영화
app.get("/kmdb/search/movie", async (req, res) => {
  const kmdbApiKey = defineSecret('VITE_KMDB_API_KEY');
  
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({
        error: "Query parameter is required",
        message: "Please provide a search query",
      });
    }

    // Secrets Manager에서 읽기
    const apiKey = kmdbApiKey.value();
    
    if (!apiKey) {
      console.error('KMDB API key not configured');
      return res.status(500).json({
        error: "KMDB API key not configured"
      });
    }

    // KMDB API 호출
    const kmdbUrl = new URL('http://api.koreafilm.or.kr/openapi-data2/wisenut/search_api/search_json2.jsp');
    kmdbUrl.searchParams.append('collection', 'kmdb_new2');
    kmdbUrl.searchParams.append('query', query);
    kmdbUrl.searchParams.append('detail', 'Y');
    kmdbUrl.searchParams.append('listCount', '20');
    kmdbUrl.searchParams.append('ServiceKey', apiKey);

    console.log('KMDB Request URL:', kmdbUrl.toString());
    console.log('Query:', query);

    const response = await fetch(kmdbUrl.toString(), {
      method: "GET",
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`KMDB API error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    
    // KMDB 응답을 TMDB 형식으로 변환 (호환성 유지)
    // KMDB 구조: data.Data[0].Result = [{movie, movieId, posters, directors, ...}]
    const movies = data.Data?.[0]?.Result || [];
    
    const transformedData = {
      results: movies.map((movie) => {
        // Title에서 마크업 태그 제거 (!HS, !HE 등)
        const cleanTitle = (movie.title || '').replace(/!HS|!HE|<[^>]*>/g, '').trim();
        
        // posters는 파이프(|)로 구분된 문자열이므로 첫 번째 URL만 추출
        const posterUrl = movie.posters ? movie.posters.split('|')[0] : '';
        
        // stlls는 파이프(|)로 구분된 문자열이므로 첫 번째 URL만 추출
        const stillUrl = movie.stlls ? movie.stlls.split('|')[0] : '';
        
        // directors 구조: { director: [{ directorNm, ... }] }
        const directorName = movie.directors?.director?.[0]?.directorNm || '';
        
        // actors 구조: { actor: [{ actorNm, ... }] }
        const actorsList = movie.actors?.actor || [];
        const actorNames = actorsList.map((actor) => actor.actorNm).join(', ') || '';
        
        // plots 구조: { plot: [{ plotText, ... }] }
        const plotText = movie.plots?.plot?.[0]?.plotText || '';
        
        // ratings 구조: { rating: [{ ratingGrade, ... }] }
        const ratingGrade = movie.ratings?.rating?.[0]?.ratingGrade || movie.rating || '';
        
        return {
          id: movie.movieSeq || movie.DOCID,
          title: cleanTitle || '',
          original_title: movie.titleEng || movie.titleOrg || cleanTitle,
          overview: plotText,
          poster_path: posterUrl,
          backdrop_path: stillUrl, // 스틸컷 URL
          release_date: movie.repRlsDate || movie.prodYear,
          vote_average: 0,
          director: directorName,
          actors: actorNames,
          runtime: movie.runtime || '',
          rating: ratingGrade,
          year: movie.prodYear || '',
          genre: movie.genre || '',
          nation: movie.nation || '',
        };
      }),
      totalResults: data.Data?.[0]?.TotalCount || data.TotalCount || 0,
    };

    res.json(transformedData);
  } catch (error) {
    console.error("KMDB API Error:", error.message);
    console.error("Error Stack:", error.stack);
    res.status(500).json({
      error: "Failed to search movies",
      message: error.message,
    });
  }
});

// TMDB API 영화 검색 (프록시)
app.get("/tmdb/search/movie", async (req, res) => {
  const tmdbApiKey = defineSecret('VITE_TMDB_API_KEY');
  
  try {
    const { query, page = 1 } = req.query;

    if (!query) {
      return res.status(400).json({
        error: "Query parameter is required",
        message: "Please provide a search query",
      });
    }

    // Secrets Manager에서 읽기
    const apiKey = tmdbApiKey.value();
    
    if (!apiKey) {
      console.error('TMDB API key not configured');
      return res.status(500).json({
        error: "TMDB API key not configured"
      });
    }

    // TMDB API 호출
    const response = await fetch(
      `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(query)}&page=${page}&language=ko-KR`,
      {
        method: "GET",
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`TMDB API error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("TMDB API Error:", error.message);
    res.status(500).json({
      error: "Failed to search movies",
      message: error.message,
    });
  }
});

// TMDB API TV 시리즈 검색 (프록시)
app.get("/tmdb/search/tv", async (req, res) => {
  const tmdbApiKey = defineSecret('VITE_TMDB_API_KEY');
  
  try {
    const { query, page = 1 } = req.query;

    if (!query) {
      return res.status(400).json({
        error: "Query parameter is required",
        message: "Please provide a search query",
      });
    }

    // Secrets Manager에서 읽기
    const apiKey = tmdbApiKey.value();
    
    if (!apiKey) {
      console.error('TMDB API key not configured');
      return res.status(500).json({
        error: "TMDB API key not configured"
      });
    }

    // TMDB API 호출
    const response = await fetch(
      `https://api.themoviedb.org/3/search/tv?api_key=${apiKey}&query=${encodeURIComponent(query)}&page=${page}&language=ko-KR`,
      {
        method: "GET",
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`TMDB API error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("TMDB API Error:", error.message);
    res.status(500).json({
      error: "Failed to search series",
      message: error.message,
    });
  }
});

// TMDB API TV 시리즈 상세 정보 (프록시)
app.get("/tmdb/tv/:tvId", async (req, res) => {
  const tmdbApiKey = defineSecret('VITE_TMDB_API_KEY');
  
  try {
    const { tvId } = req.params;

    if (!tvId) {
      return res.status(400).json({
        error: "TV ID is required",
        message: "Please provide a TV series ID",
      });
    }

    // Secrets Manager에서 읽기
    const apiKey = tmdbApiKey.value();
    
    if (!apiKey) {
      console.error('TMDB API key not configured');
      return res.status(500).json({
        error: "TMDB API key not configured"
      });
    }

    // TMDB API 호출 (created_by와 credits 포함)
    const response = await fetch(
      `https://api.themoviedb.org/3/tv/${tvId}?api_key=${apiKey}&language=ko-KR&append_to_response=credits`,
      {
        method: "GET",
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`TMDB API error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("TMDB TV Detail Error:", error.message);
    res.status(500).json({
      error: "Failed to get series details",
      message: error.message,
    });
  }
});

// Melona API 음원 검색 + Last.fm 앨범 아트
app.get("/melona/search/song", async (req, res) => {
  const lastfmApiKey = defineSecret('VITE_LASTFM_API_KEY');
  
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({
        error: "Query parameter is required",
        message: "Please provide a search query",
      });
    }

    // 서버사이드에서만 Melona 사용 (클라이언트에서는 스크래핑 불가)
    const { MelonSearch, SearchSection } = require('melona');
    const melonSearch = new MelonSearch({
      timeout: 15000,
      retryOptions: {
        maxRetries: 3,
        baseDelay: 1000,
      }
    });

    const data = await melonSearch.searchSong({
      query: query,
      section: SearchSection.ALL,
    });

    // Last.fm API로 앨범 아트 추가
    let lastfmKey = lastfmApiKey.value();
    
    console.log('Last.fm API Key configured:', !!lastfmKey);
    
    if (lastfmKey) {
      // 각 곡에 대해 Last.fm에서 앨범 아트 조회 (다중 시도)
      const enrichedData = await Promise.all(
        data.map(async (song) => {
          try {
            let albumImg = '';

            // 1차: 곡명 + 아티스트로 track.getinfo 시도
            const trackResponse = await fetch(
              `https://ws.audioscrobbler.com/2.0/?method=track.getinfo&artist=${encodeURIComponent(song.artist)}&track=${encodeURIComponent(song.title)}&api_key=${lastfmKey}&format=json`,
              { method: 'GET' }
            );

            if (trackResponse.ok) {
              const trackData = await trackResponse.json();
              if (trackData.track?.album?.image) {
                const imageArray = trackData.track.album.image;
                albumImg = imageArray[imageArray.length - 1]?.['#text'] || '';
              }
            }

            // 2차: 곡 검색 실패 시 앨범명만으로 album.getinfo 시도
            if (!albumImg) {
              const albumResponse = await fetch(
                `https://ws.audioscrobbler.com/2.0/?method=album.search&album=${encodeURIComponent(song.album)}&api_key=${lastfmKey}&format=json`,
                { method: 'GET' }
              );

              if (albumResponse.ok) {
                const albumData = await albumResponse.json();
                if (albumData.results?.albummatches?.album?.[0]?.image) {
                  const imageArray = albumData.results.albummatches.album[0].image;
                  albumImg = imageArray[imageArray.length - 1]?.['#text'] || '';
                }
              }
            }

            // 3차: 앨범 검색 실패 시 아티스트만으로 artist.getinfo 시도
            if (!albumImg) {
              const artistResponse = await fetch(
                `https://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=${encodeURIComponent(song.artist)}&api_key=${lastfmKey}&format=json`,
                { method: 'GET' }
              );

              if (artistResponse.ok) {
                const artistData = await artistResponse.json();
                if (artistData.artist?.image) {
                  const imageArray = artistData.artist.image;
                  albumImg = imageArray[imageArray.length - 1]?.['#text'] || '';
                }
              }
            }

            return {
              ...song,
              albumImg: albumImg // 앨범 아트 URL 추가 (모든 방법 실패하면 빈 문자열)
            };
          } catch (err) {
            console.error(`Failed to get album art for ${song.title}:`, err.message);
          }
          
          return song;
        })
      );

      res.json(enrichedData);
    } else {
      console.log('Last.fm API Key not configured, returning basic data');
      // Last.fm 키가 없으면 기본 Melona 데이터만 반환
      res.json(data);
    }
  } catch (error) {
    console.error("Melona API Error:", error.message);
    res.status(500).json({
      error: "Failed to search songs",
      message: error.message,
    });
  }
});

// Naver API 책 검색 (프록시)
app.get("/naver/search/book", async (req, res) => {
  const naverClientId = defineSecret('VITE_NAVER_CLIENT_ID');
  const naverClientSecret = defineSecret('VITE_NAVER_CLIENT_SECRET');
  
  try {
    const { query, display = 20, start = 1, sort = "sim" } = req.query;

    if (!query) {
      return res.status(400).json({
        error: "Query parameter is required",
        message: "Please provide a search query",
      });
    }

    // Secrets Manager에서 읽기
    let clientId = naverClientId.value();
    let clientSecret = naverClientSecret.value();
    
    if (!clientId || !clientSecret) {
      console.error('Naver API credentials not configured');
      return res.status(500).json({
        error: "Naver API credentials not configured"
      });
    }

    // Naver API 호출 (백엔드에서 Secret 사용)
    const response = await fetch(
      `https://openapi.naver.com/v1/search/book.json?query=${encodeURIComponent(query)}&display=${display}&start=${start}&sort=${sort}`,
      {
        method: "GET",
        headers: {
          "X-Naver-Client-Id": clientId,
          "X-Naver-Client-Secret": clientSecret,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Naver API error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Naver API Error:", error.message);
    res.status(500).json({
      error: "Failed to search books",
      message: error.message,
    });
  }
});

// Error Handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    error: "Internal Server Error",
    message: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// Cloud Function으로 exports (v2 API + Secrets)
exports.api = onRequest(
  {
    secrets: [
      'VITE_NAVER_CLIENT_ID',
      'VITE_NAVER_CLIENT_SECRET',
      'VITE_TMDB_API_KEY',
      'VITE_LASTFM_API_KEY',
      'VITE_KMDB_API_KEY'
    ]
  },
  app
);
