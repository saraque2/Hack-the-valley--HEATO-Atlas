<script>
let title = $state("HEATO Atlas");
</script>

<main>
    <cite>Know your city, and strive to make it better</cite>
        
    <h1>{title}</h1>
    <h3>Navigation Menu</h3>

    <p>Do not let the heat get to you!</p>

    <div class="button-container">
        <a href="/cooling_centres" class="btn">Toronto Cooling Centres</a>
        <a href="/Fire_Stations" class="btn">Fire Stations</a>
    </div>

</main>

<style>
    main {
        text-align: center;
        margin-top: 4rem;
        font-family: sans-serif;
        padding: 0 1rem;
    }

    .button-container {
        display: flex;
        justify-content: center;
        flex-wrap: wrap;
        gap: 1rem;
        margin-top: 1.5rem;
    }

    /* Style anchor tags to look and behave like buttons cleanly */
    .btn {
        display: inline-block;
        padding: 0.75rem 1.5rem;
        font-size: 1rem;
        background-color: #4169E1;
        color: white;
        text-decoration: none;
        border-radius: 6px;
        cursor: pointer;
        transition: background 0.2s;
    }

    .btn:hover {
        background-color: #3154b3;
    }
</style>