import React, { useRef, useEffect, useState } from 'react';
import { FaCarSide } from 'react-icons/fa';

function App() {
  // Canvas ref.
  const canvasRef = useRef(null);

  // Game state variables.
  const [hasStarted, setHasStarted] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [finalMiles, setFinalMiles] = useState(0);
  const [finalDate, setFinalDate] = useState('');
  const [topScores, setTopScores] = useState([]);
  const [playerName, setPlayerName] = useState('');
  const [isHighScoreEligible, setIsHighScoreEligible] = useState(false);
  
  // For pausing.
  const pausedTimeRef = useRef(0);

  // For password protecting the start screen.
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [enteredPassword, setEnteredPassword] = useState("");

  // Spaceship position.
  const [shipPos, setShipPos] = useState({
    x: window.innerWidth / 2 - 50,
    y: window.innerHeight - 80 - 50,
  });
  const shipPosRef = useRef(shipPos);
  useEffect(() => {
    shipPosRef.current = shipPos;
  }, [shipPos]);

  // Spaceship properties.
  const initialShotCooldown = 600; // 600ms starting cooldown.
  const shipInfo = useRef({
    speed: 7,
    width: 100,
    height: 80,
    lastShotTime: 0,
    shotCooldown: initialShotCooldown,
  });

  // Refs for bullets, enemies, and power-ups.
  const bullets = useRef([]); // Each bullet: { x, y, radius, speed, dx?, dy?, penetration? }
  const enemies = useRef([]); // Each enemy: { x, y, width, height, speed }
  const powerUps = useRef([]); // Each power-up: { x, y, width, height, speed, type }
  const score = useRef(0);
  const protectionRemaining = useRef(0);
  const lastPowerUpMiles = useRef(0);
  // Power-up flags.
  const hasMoa = useRef(false);
  const hasDropped44k = useRef(false);
  const hasDroppedEpr = useRef(false);
  const is44kActive = useRef(false);
  const isEprActive = useRef(false);
  const moaCollectedMiles = useRef(null);
  const four4kCollectedMiles = useRef(null);
  const eprCollectedMiles = useRef(null);

  // Ref for pressed keys.
  const keys = useRef({});

  // Game start time.
  const startTime = useRef(performance.now());

  // Load custom images.
  // Place your moa.png (112×190) in your public folder.
  const moaImage = useRef(null);
  useEffect(() => {
    const img = new Image();
    img.src = '/moa.png';
    moaImage.current = img;
  }, []);
  // Place your 44k.png (112×190) in your public folder.
  const four4kImage = useRef(null);
  useEffect(() => {
    const img = new Image();
    img.src = '/44k.png';
    four4kImage.current = img;
  }, []);
  // Place your epr.png (112×190) in your public folder.
  const eprImage = useRef(null);
  useEffect(() => {
    const img = new Image();
    img.src = '/epr.png';
    eprImage.current = img;
  }, []);

  // Set up key event listeners.
  useEffect(() => {
    const handleKeyDown = (e) => {
      keys.current[e.code] = true;
    };
    const handleKeyUp = (e) => {
      keys.current[e.code] = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Pause toggle handler.
  const togglePause = () => {
    if (!isPaused) {
      pausedTimeRef.current = performance.now() - startTime.current;
      setIsPaused(true);
    } else {
      startTime.current = performance.now() - pausedTimeRef.current;
      setIsPaused(false);
    }
  };

  // Start game handler.
  const handleStartGame = () => {
    setHasStarted(true);
    startTime.current = performance.now();
  };

  // Finalize game.
  const finalizeGame = (currentTime) => {
    const elapsed = currentTime - startTime.current;
    const miles = Math.floor((elapsed / 60000) * 10000);
    setFinalMiles(miles);
    setFinalScore(score.current);
    const nowStr = new Date().toLocaleString();
    setFinalDate(nowStr);
    const record = { score: score.current, miles, date: nowStr, name: '' };
    const stored = localStorage.getItem("topScores");
    let storedScores = stored ? JSON.parse(stored) : [];
    storedScores.push(record);
    storedScores.sort((a, b) => (b.score !== a.score ? b.score - a.score : b.miles - a.miles));
    storedScores = storedScores.slice(0, 3);
    localStorage.setItem("topScores", JSON.stringify(storedScores));
    setTopScores(storedScores);
    const qualifies = storedScores.some(
      (r) =>
        r.score === record.score &&
        r.miles === record.miles &&
        r.date === record.date &&
        (!r.name || r.name.trim() === '')
    );
    setIsHighScoreEligible(qualifies);
  };

  // Game loop.
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    let lastTime = performance.now();
    let animationFrameId;
    function gameLoop(timestamp) {
      const deltaTime = timestamp - lastTime;
      lastTime = timestamp;
      // Only update game if started, not over, and not paused.
      if (hasStarted && !isGameOver && !isPaused) {
        updateGame(timestamp, deltaTime);
      }
      drawGame();
      animationFrameId = requestAnimationFrame(gameLoop);
    }
    animationFrameId = requestAnimationFrame(gameLoop);
    function updateGame(currentTime, deltaTime) {
      const currentMiles = Math.floor((performance.now() - startTime.current) / 60000 * 10000);
      // Expire MOA, 44k, and EPR effects after 5000 miles.
      if (hasMoa.current && moaCollectedMiles.current !== null && currentMiles >= moaCollectedMiles.current + 5000) {
        shipInfo.current.shotCooldown = initialShotCooldown;
        protectionRemaining.current = 0;
        hasMoa.current = false;
        moaCollectedMiles.current = null;
        is44kActive.current = false;
        four4kCollectedMiles.current = null;
        isEprActive.current = false;
        eprCollectedMiles.current = null;
        hasDropped44k.current = false;
        hasDroppedEpr.current = false;
      }
      if (is44kActive.current && four4kCollectedMiles.current !== null && currentMiles >= four4kCollectedMiles.current + 5000) {
        is44kActive.current = false;
        four4kCollectedMiles.current = null;
      }
      if (isEprActive.current && eprCollectedMiles.current !== null && currentMiles >= eprCollectedMiles.current + 5000) {
        isEprActive.current = false;
        eprCollectedMiles.current = null;
      }
      // 1. Update spaceship position.
      let newX = shipPosRef.current.x;
      if (keys.current['ArrowLeft']) newX -= shipInfo.current.speed;
      if (keys.current['ArrowRight']) newX += shipInfo.current.speed;
      newX = Math.max(0, Math.min(newX, canvas.width - shipInfo.current.width));
      if (newX !== shipPosRef.current.x) {
        shipPosRef.current.x = newX;
        setShipPos({ ...shipPosRef.current });
      }
      // 2. Shooting.
      if (keys.current['Space']) {
        if (currentTime - shipInfo.current.lastShotTime > shipInfo.current.shotCooldown) {
          if (isEprActive.current) {
            // Fire three bullets (spray pattern).
            const centerBullet = {
              x: shipPosRef.current.x + shipInfo.current.width / 2,
              y: shipPosRef.current.y,
              radius: 5,
              dx: 0,
              dy: 8,
            };
            const angle = Math.PI / 6; // 30 degrees.
            const speed = 8;
            const leftBullet = {
              x: shipPosRef.current.x + shipInfo.current.width / 2,
              y: shipPosRef.current.y,
              radius: 5,
              dx: -speed * Math.sin(angle),
              dy: speed * Math.cos(angle),
            };
            const rightBullet = {
              x: shipPosRef.current.x + shipInfo.current.width / 2,
              y: shipPosRef.current.y,
              radius: 5,
              dx: speed * Math.sin(angle),
              dy: speed * Math.cos(angle),
            };
            if (is44kActive.current) {
              centerBullet.penetration = 2;
              leftBullet.penetration = 2;
              rightBullet.penetration = 2;
            }
            bullets.current.push(centerBullet, leftBullet, rightBullet);
          } else {
            const bulletObj = {
              x: shipPosRef.current.x + shipInfo.current.width / 2,
              y: shipPosRef.current.y,
              radius: 5,
              dx: 0,
              dy: 8,
            };
            if (is44kActive.current) {
              bulletObj.penetration = 2;
            }
            bullets.current.push(bulletObj);
          }
          shipInfo.current.lastShotTime = currentTime;
        }
      }
      // 3. Update bullets.
      bullets.current = bullets.current.filter((bullet) => {
        bullet.x += bullet.dx || 0;
        bullet.y -= bullet.dy || 8;
        return bullet.y + bullet.radius > 0;
      });
      // 4. Spawn enemies.
      if (Math.random() < 0.015) {
        enemies.current.push({
          x: Math.random() * (canvas.width - 60),
          y: -60,
          width: 60,
          height: 60,
          speed: 2 + Math.random() * 1,
        });
      }
      // 5. Update enemies.
      enemies.current = enemies.current.filter((enemy) => {
        enemy.y += enemy.speed;
        if (enemy.y - enemy.height >= canvas.height) {
          const penalty = is44kActive.current ? 50 : 100;
          if (protectionRemaining.current > 0) {
            if (protectionRemaining.current >= penalty) {
              protectionRemaining.current -= penalty;
            } else {
              const leftover = penalty - protectionRemaining.current;
              protectionRemaining.current = 0;
              score.current -= leftover;
            }
          } else {
            score.current -= penalty;
          }
          return false;
        }
        return true;
      });
      // 6. Spawn MOA power-up every 5000 miles.
      if (currentMiles >= lastPowerUpMiles.current + 5000) {
        powerUps.current.push({
          x: Math.random() * (canvas.width - 112),
          y: -190,
          width: 112,
          height: 190,
          speed: 4, // MOA drops at double speed.
          type: "MOA",
        });
        lastPowerUpMiles.current = currentMiles;
      }
      // 7. Spawn 44k power-up if MOA is active and not already active/dropped.
      if (hasMoa.current && !is44kActive.current && !hasDropped44k.current && Math.random() < 0.005) {
        powerUps.current.push({
          x: Math.random() * (canvas.width - 112),
          y: -190,
          width: 112,
          height: 190,
          speed: 6, // 44k drops at triple speed.
          type: "44k",
        });
        hasDropped44k.current = true;
      }
      // 8. Spawn EPR power-up if MOA and 44k are active and EPR not active/dropped.
      if (hasMoa.current && is44kActive.current && !isEprActive.current && !hasDroppedEpr.current && Math.random() < 0.005) {
        powerUps.current.push({
          x: Math.random() * (canvas.width - 112),
          y: -190,
          width: 112,
          height: 190,
          speed: 6, // same as 44k.
          type: "EPR",
        });
        hasDroppedEpr.current = true;
      }
      // 9. Update power-ups.
      powerUps.current = powerUps.current.filter((pu) => {
        pu.y += pu.speed;
        return pu.y - pu.height < canvas.height;
      });
      // 10. Collision detection: Bullets vs. enemies.
      for (let i = enemies.current.length - 1; i >= 0; i--) {
        const enemy = enemies.current[i];
        for (let j = bullets.current.length - 1; j >= 0; j--) {
          const bullet = bullets.current[j];
          if (
            bullet.x > enemy.x &&
            bullet.x < enemy.x + enemy.width &&
            bullet.y > enemy.y &&
            bullet.y < enemy.y + enemy.height
          ) {
            enemies.current.splice(i, 1);
            score.current += 100;
            if (bullet.penetration !== undefined) {
              bullet.penetration -= 1;
              if (bullet.penetration <= 0) {
                bullets.current.splice(j, 1);
              }
            } else {
              bullets.current.splice(j, 1);
            }
            break;
          }
        }
      }
      // 11. Collision detection: Power-ups vs. spaceship.
      for (let i = powerUps.current.length - 1; i >= 0; i--) {
        const pu = powerUps.current[i];
        if (
          shipPosRef.current.x < pu.x + pu.width &&
          shipPosRef.current.x + shipInfo.current.width > pu.x &&
          shipPosRef.current.y < pu.y + pu.height &&
          shipPosRef.current.y + shipInfo.current.height > pu.y
        ) {
          powerUps.current.splice(i, 1);
          if (pu.type === "MOA") {
            shipInfo.current.shotCooldown = 300;
            protectionRemaining.current = 5000;
            hasMoa.current = true;
            moaCollectedMiles.current = currentMiles;
            hasDropped44k.current = false;
            hasDroppedEpr.current = false;
          } else if (pu.type === "44k") {
            is44kActive.current = true;
            four4kCollectedMiles.current = currentMiles;
          } else if (pu.type === "EPR") {
            protectionRemaining.current += 2000;
            isEprActive.current = true;
            eprCollectedMiles.current = currentMiles;
          }
        }
      }
      // 12. Collision detection: Enemies vs. spaceship.
      for (let enemy of enemies.current) {
        if (
          shipPosRef.current.x < enemy.x + enemy.width &&
          shipPosRef.current.x + shipInfo.current.width > enemy.x &&
          shipPosRef.current.y < enemy.y + enemy.height &&
          shipPosRef.current.y + shipInfo.current.height > enemy.y
        ) {
          setIsGameOver(true);
          finalizeGame(currentTime);
          break;
        }
      }
    }
    function drawGame() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // Draw bullets.
      ctx.fillStyle = 'yellow';
      bullets.current.forEach((bullet) => {
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
        ctx.fill();
      });
      // Draw enemies.
      ctx.fillStyle = 'red';
      enemies.current.forEach((enemy) => {
        ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
      });
      // Draw power-ups.
      powerUps.current.forEach((pu) => {
        if (pu.type === "MOA" && moaImage.current) {
          ctx.drawImage(moaImage.current, pu.x, pu.y, pu.width, pu.height);
        } else if (pu.type === "44k" && four4kImage.current) {
          ctx.drawImage(four4kImage.current, pu.x, pu.y, pu.width, pu.height);
        } else if (pu.type === "EPR" && eprImage.current) {
          ctx.drawImage(eprImage.current, pu.x, pu.y, pu.width, pu.height);
        } else {
          ctx.fillStyle = 'blue';
          ctx.fillRect(pu.x, pu.y, pu.width, pu.height);
        }
      });
      // Draw score.
      ctx.fillStyle = 'white';
      ctx.font = '48px Arial, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`Score: ${score.current.toLocaleString()}`, canvas.width - 20, 50);
      // Draw Miles; if game hasn't started, show 0.
      const elapsed = !hasStarted
        ? 0
        : isGameOver
        ? finalMiles
        : Math.floor((isPaused ? pausedTimeRef.current : performance.now() - startTime.current) / 60000 * 10000);
      ctx.textAlign = 'left';
      ctx.fillText(`Miles: ${elapsed.toLocaleString()}`, 20, 50);
      // Draw Protection info if active.
      if (protectionRemaining.current > 0) {
        ctx.fillStyle = 'white';
        ctx.font = '48px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText("Protection", canvas.width / 2, 50);
        ctx.fillText(protectionRemaining.current.toLocaleString(), canvas.width / 2, 100);
      }
      // If game is over, draw GAME OVER.
      if (isGameOver) {
        ctx.fillStyle = 'white';
        ctx.font = '96px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2);
      }
      // Draw power-up icons on the top left.
      if (protectionRemaining.current > 0 && moaImage.current) {
        ctx.drawImage(moaImage.current, 20, 70, 112, 190);
      }
      if (is44kActive.current && four4kImage.current) {
        ctx.drawImage(four4kImage.current, 20 + 112 + 10, 70, 112, 190);
      }
      if (isEprActive.current && eprImage.current) {
        ctx.drawImage(eprImage.current, 20 + 112 + 10 + 112 + 10, 70, 112, 190);
      }
      // Draw pause overlay.
      if (isPaused) {
        ctx.fillStyle = 'white';
        ctx.font = '48px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2);
      }
    }
    return () => cancelAnimationFrame(animationFrameId);
  }, [hasStarted, isGameOver, finalMiles, finalScore, finalDate, isPaused]);

  const handleNameSubmit = () => {
    const stored = localStorage.getItem("topScores");
    let storedScores = stored ? JSON.parse(stored) : [];
    const idx = storedScores.findIndex(
      (r) =>
        r.score === finalScore &&
        r.miles === finalMiles &&
        r.date === finalDate &&
        (!r.name || r.name.trim() === '')
    );
    if (idx !== -1) {
      storedScores[idx].name = playerName;
      localStorage.setItem("topScores", JSON.stringify(storedScores));
      setTopScores(storedScores);
      setIsHighScoreEligible(false);
    }
  };

  const handleNewGame = () => {
    score.current = 0;
    bullets.current = [];
    enemies.current = [];
    powerUps.current = [];
    protectionRemaining.current = 0;
    hasMoa.current = false;
    is44kActive.current = false;
    isEprActive.current = false;
    hasDropped44k.current = false;
    hasDroppedEpr.current = false;
    moaCollectedMiles.current = null;
    four4kCollectedMiles.current = null;
    eprCollectedMiles.current = null;
    shipInfo.current.lastShotTime = 0;
    shipInfo.current.shotCooldown = initialShotCooldown;
    const newShipPos = {
      x: window.innerWidth / 2 - 50,
      y: window.innerHeight - 80 - 50,
    };
    setShipPos(newShipPos);
    shipPosRef.current = newShipPos;
    startTime.current = performance.now();
    lastPowerUpMiles.current = 0;
    setIsGameOver(false);
    setIsPaused(false);
    setHasStarted(true);
  };

  const handleResetTopScores = () => {
    localStorage.removeItem("topScores");
    setTopScores([]);
  };

  // Start screen overlay with password protection.
  return (
    <div
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        background: '#000',
        overflow: 'hidden',
      }}
    >
      <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0 }} />
      <FaCarSide
        style={{
          position: 'absolute',
          fontSize: '100px',
          color: 'green',
          left: shipPos.x,
          top: shipPos.y,
          transform: 'rotate(-90deg)',
          pointerEvents: 'none',
        }}
      />
      {/* Start Screen Overlay with Password Protection */}
      {!hasStarted && !isGameOver && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0,0,0,0.8)',
            zIndex: 20,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            fontFamily: 'Arial, sans-serif',
            fontWeight: 'bold',
            fontSize: '36px',
            color: 'white',
            textAlign: 'center',
            padding: '20px',
          }}
        >
          {!isAuthenticated ? (
            <>
              <div style={{ marginBottom: '20px' }}>Enter Password:</div>
              <input
                type="password"
                value={enteredPassword}
                onChange={(e) => setEnteredPassword(e.target.value)}
                style={{
                  fontSize: '36px',
                  padding: '5px',
                  marginBottom: '20px',
                  width: '300px',
                  textAlign: 'center',
                }}
              />
              <button
                onClick={() => {
                  if (enteredPassword === "BGSmartVMA") {
                    setIsAuthenticated(true);
                  } else {
                    alert("Incorrect password");
                  }
                }}
                style={{
                  fontSize: '36px',
                  padding: '10px 20px',
                  fontFamily: 'Arial, sans-serif',
                  fontWeight: 'bold',
                }}
              >
                Submit
              </button>
            </>
          ) : (
            <>
              <div style={{ fontSize: '96px', marginBottom: '20px' }}>GAME TITLE</div>
              <button
                onClick={handleStartGame}
                style={{
                  fontSize: '48px',
                  padding: '10px 20px',
                  fontFamily: 'Arial, sans-serif',
                  fontWeight: 'bold',
                }}
              >
                Start Game
              </button>
            </>
          )}
        </div>
      )}
      {/* Pause Button (visible during gameplay) */}
      {hasStarted && !isGameOver && (
        <button
          onClick={togglePause}
          style={{
            position: 'absolute',
            top: '110px',
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: '36px',
            fontFamily: 'Arial, sans-serif',
            fontWeight: 'bold',
            padding: '10px 20px',
            zIndex: 15,
          }}
        >
          {isPaused ? 'Resume' : 'Pause'}
        </button>
      )}
      {/* Game Over Overlay */}
      {isGameOver && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0,0,0,0.8)',
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            color: 'white',
            textAlign: 'center',
            padding: '20px',
            fontFamily: 'Arial, sans-serif',
            fontWeight: 'bold',
          }}
        >
          <div style={{ fontSize: '96px', marginBottom: '20px' }}>GAME OVER</div>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>
            Final Score: {finalScore.toLocaleString()} | Miles: {finalMiles.toLocaleString()}
            <br />
            <div>
              Date:
              <br />
              {finalDate.split(',')[0]}
              <br />
              {finalDate.split(',')[1] ? finalDate.split(',')[1].trim() : ''}
            </div>
          </div>
          {isHighScoreEligible && (
            <div style={{ marginBottom: '20px', fontSize: '48px' }}>
              Enter Your Name:{" "}
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                style={{ fontSize: '48px', padding: '5px', marginLeft: '10px', textAlign: 'center' }}
              />
              <button
                onClick={handleNameSubmit}
                style={{ fontSize: '48px', padding: '5px 10px', marginLeft: '20px' }}
              >
                Submit
              </button>
            </div>
          )}
          <div style={{ marginBottom: '20px' }}>
            <button
              onClick={handleNewGame}
              style={{
                fontSize: '48px',
                padding: '10px 20px',
                marginRight: '20px',
                fontFamily: 'Arial, sans-serif',
                fontWeight: 'bold',
              }}
            >
              New Game
            </button>
            <button
              onClick={handleResetTopScores}
              style={{
                fontSize: '48px',
                padding: '10px 20px',
                fontFamily: 'Arial, sans-serif',
                fontWeight: 'bold',
              }}
            >
              Reset Top Scores
            </button>
          </div>
          <div
            style={{
              fontSize: '36px',
              fontFamily: 'Arial, sans-serif',
              fontWeight: 'bold',
              width: '100%',
              maxWidth: '1000px',
              margin: '0 auto',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-around',
                alignItems: 'center',
              }}
            >
              <span style={{ width: '200px', textAlign: 'left' }}>Score</span>
              <span style={{ width: '200px', textAlign: 'left' }}>Miles</span>
              <span style={{ width: '200px', textAlign: 'left' }}>Date</span>
              <span style={{ width: '200px', textAlign: 'left' }}>Time</span>
              <span style={{ width: '200px', textAlign: 'left' }}>Name</span>
            </div>
            {topScores.length > 0 ? (
              topScores.map((entry, index) => {
                const dateParts = entry.date.split(',');
                const dateOnly = dateParts[0];
                const timeOnly = dateParts[1] ? dateParts[1].trim() : '';
                return (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-around',
                      alignItems: 'center',
                      marginTop: '10px',
                    }}
                  >
                    <span style={{ width: '200px', textAlign: 'left' }}>{entry.score.toLocaleString()}</span>
                    <span style={{ width: '200px', textAlign: 'left' }}>{entry.miles.toLocaleString()}</span>
                    <span style={{ width: '200px', textAlign: 'left' }}>{dateOnly}</span>
                    <span style={{ width: '200px', textAlign: 'left' }}>{timeOnly}</span>
                    <span style={{ width: '200px', textAlign: 'left' }}>{entry.name || '-'}</span>
                  </div>
                );
              })
            ) : (
              <div style={{ marginTop: '10px' }}>No high scores yet.</div>
            )}
          </div>
        </div>
      )}
      {isGameOver && isHighScoreEligible && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.8)',
            zIndex: 20,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            fontFamily: 'Arial, sans-serif',
            fontWeight: 'bold',
            fontSize: '36px',
            color: 'white',
          }}
        >
          <div style={{ marginBottom: '20px' }}>Enter Your Name:</div>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            style={{
              fontSize: '36px',
              padding: '5px',
              marginBottom: '20px',
              width: '300px',
              textAlign: 'center',
            }}
          />
          <button
            onClick={handleNameSubmit}
            style={{
              fontSize: '36px',
              padding: '10px 20px',
            }}
          >
            Submit
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
