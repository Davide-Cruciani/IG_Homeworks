// bgImg is the background image to be modified.
// fgImg is the foreground image.
// fgOpac is the opacity of the foreground image.
// fgPos is the position of the foreground image in pixels. It can be negative and (0,0) means the top-left pixels of the foreground and background are aligned.
function composite( bgImg, fgImg, fgOpac, fgPos )
{
    const bgWidth = bgImg.width;
    const bgHeight = bgImg.height;
    const fgWidth = fgImg.width;
    const fgHeight = fgImg.height;
    const wOffset = fgPos.x;
    const hOffset = fgPos.y;

    for (let w = 0;w<fgWidth;w++){
        for(let h=0;h<fgHeight;h++){
            const fgAlpha = fgImg.data[3 + w*4 + h*4*fgWidth]*fgOpac/255;
            const wPossInB = w+wOffset;
            const hPossInB = h+hOffset;
            let filled = false
            if(wPossInB<0 || wPossInB>=bgWidth || hPossInB<0 || hPossInB>=bgHeight) continue;
            for(let ch=0;ch<3;ch++){
                const fgValue = fgImg.data[ch + w*4 + h*4*fgWidth];          
                const bgValue = bgImg.data[ch + wPossInB*4 + hPossInB*4*bgWidth];
                bgImg.data[ch + wPossInB*4 + hPossInB*4*bgWidth] = fgValue*fgAlpha + bgValue*(1-fgAlpha);
                filled = bgImg.data[ch + wPossInB*4 + hPossInB*4*bgWidth] != 0
            }
            if (filled) bgImg.data[3 + wPossInB*4 + hPossInB*4*bgWidth] = 255;
        }
    }
}