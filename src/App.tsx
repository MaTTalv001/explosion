import React, { useState, useEffect, useRef } from 'react';
import { Flame, RefreshCw, HelpCircle } from 'lucide-react';
import { chantPatterns, type ChantSegment, type ChantPattern } from './data/chants';

// グローバル関数の型定義
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
    triggerExplosion: () => void;
    showMagicCircle: () => void;
    triggerSuccessFlash: () => void;
  }
}

function App() {
  const [currentPattern, setCurrentPattern] = useState<ChantPattern | null>(null);
  const [shuffledSegments, setShuffledSegments] = useState<ChantSegment[]>([]);
  const [selectedSegments, setSelectedSegments] = useState<ChantSegment[]>([]);
  const [gameState, setGameState] = useState<'playing' | 'success' | 'failure'>('playing');
  const [hintsRemaining, setHintsRemaining] = useState<number>(3);
  const [highlightedSegment, setHighlightedSegment] = useState<number | null>(null);
  const [showMysticEffects, setShowMysticEffects] = useState<boolean>(false);

  // YouTube Player 関連
  const playerRef = useRef<any>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [isPlayerVisible, setIsPlayerVisible] = useState(false);

  // タイマー管理用 Ref (useEffect でセットし、クリーンアップで解除する)
  const loopCheckTimerRef = useRef<number | null>(null);

  // シャッフル関数
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
    setShowMysticEffects(false);

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

    // 選択エフェクト - 小さな魔法効果を表示
    setShowMysticEffects(true);
    setTimeout(() => setShowMysticEffects(false), 500);

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
      setHighlightedSegment(
        nextSegmentNumber);
      
      // 魔法陣エフェクト（小さめ）
      if (window.showMagicCircle) {
        const magicCircle = document.getElementById('magic-circle');
        if (magicCircle) {
          magicCircle.style.width = '150px';
          magicCircle.style.height = '150px';
          window.showMagicCircle();
        }
      }
    }
  };

  // 正解時に再生を開始する関数
  const playSuccessVideo = () => {
    if (!currentPattern) return;
    
    // 魔法陣を表示
    if (window.showMagicCircle) {
      const magicCircle = document.getElementById('magic-circle');
      if (magicCircle) {
        magicCircle.style.width = '300px';
        magicCircle.style.height = '300px';
        window.showMagicCircle();
      }
    }
    
    // 爆発エフェクト
    if (window.triggerExplosion) {
      window.triggerExplosion();
    }
    
    // 成功フラッシュ
    if (window.triggerSuccessFlash) {
      window.triggerSuccessFlash();
    }
    
    // 動画を表示する
    setIsPlayerVisible(true);
    
    // 少し待ってから再生を開始（DOM更新とエフェクトのタイミングを合わせる）
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
    }, 1500);
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

  // リセットボタン
  const handleReset = () => {
    initializeGame();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-black to-red-950 text-red-400 flex flex-col items-center p-4">
      <h1 className="text-4xl font-bold mb-6 text-accent-gold cinzel-font text-center bg-clip-text text-transparent bg-gradient-to-r from-red-500 via-yellow-500 to-red-500">
        絶望の深淵より放たれし爆裂魔導
      </h1>
      <h2 className="text-xl mb-8 text-yellow-500 text-center">～紅魔族最強の破壊詠唱～</h2>

      <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Column - Game Elements */}
        <div className="flex flex-col gap-6">
          {/* Selected Segments */}
          <div className={`bg-gradient-to-br from-gray-900 to-red-950 p-4 rounded-lg border-2 ${
            showMysticEffects ? 'border-yellow-400 shadow-lg shadow-red-900/50' : 'border-red-800'
          } flex-grow min-h-[200px] overflow-y-auto transition-all duration-300`}>
            <h2 className="text-lg mb-3 text-accent-gold font-bold">解放された魔導書:</h2>
            <div className="space-y-3">
              {selectedSegments.map((segment, index) => (
                <div
                  key={index}
                  className="p-3 bg-gradient-to-r from-red-950 to-red-900 rounded text-red-300 border border-red-700 text-sm shadow-inner shadow-black/50"
                >
                  {segment.テキスト}
                </div>
              ))}
            </div>
          </div>

          {/* Available Segments */}
          <div className="flex-grow min-h-[200px]">
            <h2 className="text-lg mb-3 text-accent-gold font-bold">封印された魔法文節:</h2>
            <div className="grid grid-cols-1 gap-3 max-h-[300px] overflow-y-auto pr-1">
              {shuffledSegments.map((segment, index) => (
                <button
                  key={index}
                  onClick={() => handleSegmentClick(segment)}
                  className={`p-3 text-left rounded transition-all duration-300 border text-sm ${
                    highlightedSegment === segment.番号 
                      ? 'bg-gradient-to-r from-red-700 to-yellow-900 border-yellow-400 animate-pulse shadow-md shadow-yellow-600/30 text-yellow-200' 
                      : 'bg-gradient-to-r from-gray-900 to-red-950 border-red-800 hover:bg-red-900 hover:border-red-600 text-red-300'
                  }`}
                  disabled={gameState !== 'playing'}
                >
                  {segment.テキスト}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - YouTube Player & Controls */}
        <div className="flex flex-col gap-6">
          {/* YouTube Player or Explanation Text */}
          <div className="aspect-video bg-gradient-to-br from-gray-900 to-red-950 rounded-lg overflow-hidden border-2 border-red-900 flex items-center justify-center shadow-lg shadow-red-900/30">
            {isPlayerVisible ? (
              <div id="player-container" ref={playerContainerRef} className="w-full h-full" />
            ) : (
              <div className="text-center p-6 text-red-400">
                <p className="text-sm">
                  汝、紅魔族随一の魔法の使い手にして、
                </p>
                <p className="text-sm">
                  爆裂魔法を操りし者。
                </p>
                <p className="text-sm mt-3">
                  混沌の闇より現れし者よ。
                </p>
                <p className="text-yellow-500 text-sm mt-3 font-bold">
                  <strong>正しき詠唱の順序を組み立て</strong>
                </p>
                <p className="text-accent-gold text-lg mt-3 font-bold animate-pulse">
                  エクスプロージョンを放て！
                </p>
              </div>
            )}
          </div>
          
          {/* Game State Messages */}
          {gameState === 'failure' && (
            <div className="text-xl text-red-500 font-bold animate-pulse text-center">
              詠唱失敗！魔力が暴走してしまった！
            </div>
          )}
          
          {/* Hint Status */}
          <div className="flex justify-between items-center text-sm">
            <span className="text-yellow-500">
              神託の残滴: {hintsRemaining}/3
            </span>
            {highlightedSegment !== null && (
              <span className="text-yellow-400 animate-pulse">
                ✨ 神の啓示が届いている... 
              </span>
            )}
          </div>
          
          {/* Control Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleExplosion}
              disabled={
                !currentPattern ||
                selectedSegments.length !== currentPattern.文節.length ||
                gameState !== 'playing'
              }
              className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-red-800 to-red-600 text-yellow-200 rounded-lg hover:from-red-700 hover:to-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm flex-grow shadow-md shadow-red-900/50 font-bold"
            >
              <Flame className="w-5 h-5" />
              エクスプロージョン！
            </button>
            
            <button
              onClick={handleHint}
              disabled={hintsRemaining <= 0 || gameState !== 'playing' || highlightedSegment !== null}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-yellow-900 to-yellow-700 text-yellow-200 rounded-lg hover:from-yellow-800 hover:to-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm shadow-md shadow-yellow-900/50 font-bold"
            >
              <HelpCircle className="w-5 h-5" />
              冥府の啓示
            </button>

            <button
              onClick={handleReset}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-900 to-purple-700 text-purple-200 rounded-lg hover:from-purple-800 hover:to-purple-600 transition-all text-sm shadow-md shadow-purple-900/50 font-bold"
            >
              <RefreshCw className="w-5 h-5" />
              時空転生
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;