import React, { useState, useEffect, useRef } from 'react';
import { Flame, RefreshCw, HelpCircle } from 'lucide-react';
import { chantPatterns, type ChantSegment, type ChantPattern } from './data/chants';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

function App() {
  const [currentPattern, setCurrentPattern] = useState<ChantPattern | null>(null);
  const [shuffledSegments, setShuffledSegments] = useState<ChantSegment[]>([]);
  const [selectedSegments, setSelectedSegments] = useState<ChantSegment[]>([]);
  const [gameState, setGameState] = useState<'playing' | 'success' | 'failure'>('playing');
  const [hintsRemaining, setHintsRemaining] = useState<number>(3);
  const [highlightedSegment, setHighlightedSegment] = useState<number | null>(null);

  // YouTube Player 関連
  const playerRef = useRef<any>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [isPlayerVisible, setIsPlayerVisible] = useState(false);

  // タイマー管理用 Ref (useEffect でセットし、クリーンアップで解除する)
  const loopCheckTimerRef = useRef<number | null>(null);

  // シャッフル関数（省略可）
  const shuffleArray = <T,>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  const initializeYouTubeAPI = () => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = () => {
        createPlayer();
      };
    } else {
      createPlayer();
    }
  };

  const createPlayer = () => {
    if (!playerContainerRef.current) return;

    // プレイヤーが既に存在する場合は破棄する
    if (playerRef.current) {
      playerRef.current.destroy();
      playerRef.current = null;
    }

    // 新しいプレイヤーを作成
    playerRef.current = new window.YT.Player(playerContainerRef.current, {
      height: '100%',
      width: '100%',
      videoId: 'Msk9Bf2RMyA',
      playerVars: {
        controls: 0,
        disablekb: 1,
        modestbranding: 1,
        rel: 0,
      },
      events: {
        onReady: () => {
          setIsPlayerReady(true);
          console.log("YouTube Player is ready");
        },
        onStateChange: (event: any) => {
          console.log("Player state changed:", event.data);
        },
        onError: (event: any) => {
          console.error("Player error:", event.data);
        }
      },
    });
  };

  // ゲームを初期化
  const initializeGame = () => {
    const randomPattern = chantPatterns[Math.floor(Math.random() * chantPatterns.length)];
    setCurrentPattern(randomPattern);
    setShuffledSegments(shuffleArray(randomPattern.文節));
    setSelectedSegments([]);
    setGameState('playing');
    setIsPlayerVisible(false);
    setHintsRemaining(3);
    setHighlightedSegment(null);

    // プレイヤーを停止
    if (isPlayerReady && playerRef.current) {
      playerRef.current.stopVideo();
    }
  };

  // コンポーネント初回マウント時
  useEffect(() => {
    initializeGame();
    initializeYouTubeAPI();

    // アンマウント時にプレイヤーを破棄
    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
      }
    };
  }, []);

  // プレイヤーの表示切替時に再初期化
  useEffect(() => {
    if (isPlayerVisible && !playerRef.current && playerContainerRef.current) {
      // 表示された時に確実にプレイヤーを初期化
      setTimeout(() => {
        createPlayer();
      }, 100);
    }
  }, [isPlayerVisible]);

  const handleSegmentClick = (segment: ChantSegment) => {
    if (gameState !== 'playing') return;

    const segmentIndex = shuffledSegments.findIndex(s => s.番号 === segment.番号);
    if (segmentIndex === -1) return;

    setSelectedSegments([...selectedSegments, segment]);
    setShuffledSegments(shuffledSegments.filter((_, index) => index !== segmentIndex));
    
    // クリック後はハイライトを解除
    setHighlightedSegment(null);
  };

  // ヒント機能: 次に選ぶべきセグメントをハイライト
  const handleHint = () => {
    if (gameState !== 'playing' || hintsRemaining <= 0 || !currentPattern) return;
    
    // ヒント回数を減らす
    setHintsRemaining(prev => prev - 1);
    
    // 次に選ぶべきセグメントのインデックスを特定
    const nextSegmentNumber = currentPattern.文節[selectedSegments.length].番号;
    
    // シャッフルされたセグメント内での対応するインデックスを見つける
    const segmentIndex = shuffledSegments.findIndex(s => s.番号 === nextSegmentNumber);
    
    if (segmentIndex !== -1) {
      setHighlightedSegment(nextSegmentNumber);
    }
  };

  // 正解時に再生を開始する関数
  const playSuccessVideo = () => {
    if (!currentPattern) return;
    
    // 動画を表示する
    setIsPlayerVisible(true);
    
    // 少し待ってから再生を開始（DOM更新を待つ）
    setTimeout(() => {
      if (playerRef.current && isPlayerReady) {
        console.log("Playing success video from:", currentPattern.動画.開始時間);
        playerRef.current.loadVideoById({
          videoId: 'Msk9Bf2RMyA',
          startSeconds: currentPattern.動画.開始時間
        });
      } else {
        console.log("Player not ready yet for success video, waiting...");
        // プレイヤーがまだ準備できていない場合は、さらに待つ
        setTimeout(() => {
          if (playerRef.current) {
            console.log("Retrying success video playback...");
            playerRef.current.loadVideoById({
              videoId: 'Msk9Bf2RMyA',
              startSeconds: currentPattern.動画.開始時間
            });
          }
        }, 1000);
      }
    }, 500);
  };

  // 失敗時の動画再生関数
  const playFailureVideo = () => {
    // 動画を表示
    setIsPlayerVisible(true);
    
    // 少し待ってから再生を開始（DOM更新を待つ）
    setTimeout(() => {
      if (playerRef.current && isPlayerReady) {
        console.log("Playing failure video");
        playerRef.current.loadVideoById({
          videoId: 'oCCgxLKyxBA',
          startSeconds: 0
        });
      } else {
        console.log("Player not ready yet for failure video, waiting...");
        // プレイヤーがまだ準備できていない場合は、さらに待つ
        setTimeout(() => {
          if (playerRef.current) {
            console.log("Retrying failure video playback...");
            playerRef.current.loadVideoById({
              videoId: 'oCCgxLKyxBA',
              startSeconds: 0
            });
          }
        }, 1000);
      }
    }, 500);
  };

  // ボタンを押して答え合わせ
  const handleExplosion = () => {
    if (!currentPattern || selectedSegments.length !== currentPattern.文節.length) return;

    const isCorrect = selectedSegments.every(
      (segment, index) => segment.番号 === currentPattern.文節[index].番号
    );

    if (isCorrect) {
      setGameState('success');
    } else {
      setGameState('failure');
      playFailureVideo(); // 失敗時の動画再生
    }
  };

  // 【ポイント】成功状態になったら部分ループさせる
  useEffect(() => {
    // まず古いタイマーがあればクリア
    if (loopCheckTimerRef.current) {
      clearInterval(loopCheckTimerRef.current);
      loopCheckTimerRef.current = null;
    }

    // 正解（success）になったときの動作
    if (gameState === 'success' && currentPattern) {
      console.log("Game success! Starting video playback");
      // まず再生を開始
      playSuccessVideo();

      // ループチェック用の setInterval
      const timerId = window.setInterval(() => {
        if (!playerRef.current) return;
        const currentTime = playerRef.current.getCurrentTime();
        if (currentTime >= currentPattern.動画.終了時間) {
          console.log("Looping video");
          playerRef.current.seekTo(currentPattern.動画.開始時間, true);
        }
      }, 1000);

      // タイマーIDを記憶し、クリーンアップで使う
      loopCheckTimerRef.current = timerId;
    }

    // ★useEffect のクリーンアップ関数★
    return () => {
      // 別の状態に変わったり、コンポーネントが unmount されるときにタイマーをクリア
      if (loopCheckTimerRef.current) {
        clearInterval(loopCheckTimerRef.current);
        loopCheckTimerRef.current = null;
      }
    };
  }, [gameState, currentPattern]);

  // リセットボタンはページリロードで対応
  const handleReset = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-black text-red-500 flex flex-col items-center p-4">
      <h1 className="text-3xl font-bold mb-4 text-red-600">エクスプロージョンEX</h1>

      <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left Column - Game Elements (1/2) */}
        <div className="flex flex-col gap-4">
          {/* Selected Segments */}
          <div className="bg-gray-900 p-3 rounded-lg border-2 border-red-800 flex-grow min-h-[200px] overflow-y-auto">
            <h2 className="text-lg mb-2 text-red-400">選択された詠唱:</h2>
            <div className="space-y-2">
              {selectedSegments.map((segment, index) => (
                <div
                  key={index}
                  className="p-2 bg-gray-800 rounded text-red-400 border border-red-900 text-sm"
                >
                  {segment.テキスト}
                </div>
              ))}
            </div>
          </div>

          {/* Available Segments */}
          <div className="flex-grow min-h-[200px]">
            <h2 className="text-lg mb-2 text-red-400">利用可能な詠唱:</h2>
            <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-1">
              {shuffledSegments.map((segment, index) => (
                <button
                  key={index}
                  onClick={() => handleSegmentClick(segment)}
                  className={`p-2 bg-gray-800 text-left rounded transition-colors border text-red-400 text-sm ${
                    highlightedSegment === segment.番号 
                      ? 'bg-red-900 border-yellow-500 animate-pulse' 
                      : 'border-red-900 hover:bg-gray-700'
                  }`}
                  disabled={gameState !== 'playing'}
                >
                  {segment.テキスト}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - YouTube Player & Controls (1/2) */}
        <div className="flex flex-col gap-4">
          {/* YouTube Player or Explanation Text */}
          <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden border-2 border-red-900 flex items-center justify-center">
            {isPlayerVisible ? (
              <div id="player-container" ref={playerContainerRef} className="w-full h-full" />
            ) : (
              <div className="text-center p-4 text-red-400">
                <p className="text-sm">
                  汝、紅魔族随一の魔法の使い手にして、
                </p>
                <p className="text-sm">
                  爆裂魔法を操りし者。
                </p>
                <p className="text-sm mt-2">
                  混沌の闇より現れし者よ。
                </p>
                <p className="text-sm mt-2">
                  <strong>正しき詠唱の順序を組み立て</strong>
                </p>
                <p className="text-sm mt-2">
                  エクスプロージョンを放て！
                </p>
              </div>
            )}
          </div>
          
          {/* Game State Messages */}
          {gameState === 'failure' && (
            <div className="text-xl text-red-500 font-bold animate-pulse">
              ハズレ！もう一度挑戦してください。
            </div>
          )}
          
          {/* Hint Status */}
          <div className="flex justify-between items-center text-sm">
            <span className="text-red-400">
              導き残り: {hintsRemaining}/3
            </span>
            {highlightedSegment !== null && (
              <span className="text-yellow-500 animate-pulse">
                ✨ 導き表示中
              </span>
            )}
          </div>
          
          {/* Control Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleExplosion}
              disabled={
                !currentPattern ||
                selectedSegments.length !== currentPattern.文節.length ||
                gameState !== 'playing'
              }
              className="flex items-center gap-1 px-3 py-2 bg-red-700 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm flex-grow"
            >
              <Flame className="w-4 h-4" />
              エクスプロージョン！
            </button>
            
            <button
              onClick={handleHint}
              disabled={hintsRemaining <= 0 || gameState !== 'playing' || highlightedSegment !== null}
              className="flex items-center gap-1 px-3 py-2 bg-yellow-700 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              <HelpCircle className="w-4 h-4" />
              冥府の導き
            </button>

            <button
              onClick={handleReset}
              className="flex items-center gap-1 px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              混沌の再開
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;