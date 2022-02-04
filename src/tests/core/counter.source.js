let count = 0;
return (
  <div>
    <h1>Counter</h1>
    <p>Count: {count}</p>
    <button
      on:click={() => {
        count = count + 1;
      }}
    >
      +
    </button>
  </div>
);
