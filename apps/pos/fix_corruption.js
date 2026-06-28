const fs = require('fs');
const corruptedCode = fs.readFileSync('components/pos/POSMenuManager.tsx', 'utf8');

// The corrupted code starts the original file at exactly `Ref } from 'react'`
const marker = 'Ref } from \'react\'';
const splitIndex = corruptedCode.lastIndexOf(marker); // Use lastIndexOf just in case

if (splitIndex !== -1) {
    const recoveredOriginal = "'use client';\nimport React, { useState, useEffect, use" + corruptedCode.substring(splitIndex);
    fs.writeFileSync('components/pos/POSMenuManager_recovered.tsx', recoveredOriginal);
    console.log("Recovered to POSMenuManager_recovered.tsx");
} else {
    console.error("Marker not found.");
}
