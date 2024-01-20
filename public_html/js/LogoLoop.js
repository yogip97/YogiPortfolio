function animateDis() {
            
            var src = "images/LogoAnimation/Logo Animation_00000.png"; //your PNGGGGGGG :))))

            var result,
                xpos = 0,
                index = 0,
                numImgs = 1200, //number of image frames
                div,
                frameSize = 0 , //width of container 
                unit = 'px'; 

            var $img = $('<img src="' + src + '">');
            $img.bind('load', function () {
                $('#id').css('background-image', 'url(' + src + ')');
                init();
            });

            var init = function() {
                div = document.getElementById('id');
                loop();
                result = setInterval(loop, 40); //function + loop time
            };

            var loop = function() {
                div.style.backgroundPosition = (-xpos) + unit + " 0";
                xpos += frameSize;
                index += 1;

                if (index === numImgs) {
                    clearInterval(result);
                }
            };
            
    }