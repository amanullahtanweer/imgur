package main

import (
	"fmt"
	"io"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"os/exec"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
)

// Image type struct
type Image struct {
	Name        string    `json:"name"`
	Time        time.Time `json:"created"`
	Size        int64     `json:"size"`
	IsDirectory bool      `json:"isDirectory"`
}

// Images type struct
type Images struct {
	Image []Image
}

// Error type struct
type Error struct {
	Error string `json:"error"`
}

// Message type struct
type Message struct {
	Message string `json:"message"`
}

func upload(c echo.Context) error {
	t := time.Now()
	year := strconv.Itoa(t.Year())
	month := strconv.Itoa(int(t.Month()))
	form, err := c.MultipartForm()
	if err != nil {
		return err
	}
	var links []string
	files := form.File["files"]

	for _, file := range files {

		id, err := exec.Command("uuidgen").Output()
		if err != nil {
			log.Fatal(err)
		}

		// Source
		src, err := file.Open()
		if err != nil {
			return err
		}
		defer src.Close()

		// Destination
		path := `media/%s/%s/%s`

		// Wordpress type folder structure media/2020/01
		os.MkdirAll(fmt.Sprintf(path, year, month, ""), os.ModePerm)

		filename := file.Filename
		filename = strings.TrimSuffix(string(id), "\n") + ".png"

		dst, err := os.Create(fmt.Sprintf(path, year, month, filename))
		if err != nil {
			return err
		}
		defer dst.Close()

		// Copy
		if _, err = io.Copy(dst, src); err != nil {
			return err
		}
		links = append(links, fmt.Sprintf(path, year, month, filename))
	}

	return c.JSON(http.StatusOK, links)
}

func list(c echo.Context) error {

	path := `media/%s/%s`
	year := c.Param("year")
	month := c.Param("month")
	files, err := ioutil.ReadDir(fmt.Sprintf(path, year, month))
	if err != nil {
		return err
	}

	sort.Slice(files, func(i, j int) bool {
		return files[i].ModTime().Before(files[j].ModTime())
	})

	images := []Image{}

	for _, f := range files {

		images = append(images, Image{Name: f.Name(), Time: f.ModTime(), Size: f.Size(), IsDirectory: f.IsDir()})
	}

	return c.JSON(http.StatusOK, images)
}

func main() {
	e := echo.New()

	e.Use(middleware.Logger())
	e.Use(middleware.Recover())
	e.Use(middleware.BodyLimit("5M"))
	e.Use(middleware.GzipWithConfig(middleware.GzipConfig{
		Level: 5,
	}))
	e.Use(middleware.CSRFWithConfig(middleware.CSRFConfig{
		TokenLookup: "header:X-CSRF-Token",
	}))
	e.Use(middleware.Secure())

	e.Static("/", "public")
	e.Static("/media", "media")
	e.GET("/", func(c echo.Context) (err error) {
		pusher, ok := c.Response().Writer.(http.Pusher)
		if ok {
			if err = pusher.Push("/app.css", nil); err != nil {
				return
			}
			if err = pusher.Push("/app.js", nil); err != nil {
				return
			}
		}
		return c.File("public/index.html")
	})
	e.POST("/api/upload", upload)
	e.GET("/api/list/:year/:month", list)

	e.GET("/request", func(c echo.Context) error {
		req := c.Request()
		format := `
			<code>
			Protocol: %s<br>
			Host: %s<br>
			Remote Address: %s<br>
			Method: %s<br>
			Path: %s<br>
			</code>
		`
		return c.HTML(http.StatusOK, fmt.Sprintf(format, req.Proto, req.Host, req.RemoteAddr, req.Method, req.URL.Path))
	})
	e.Logger.Fatal(e.StartTLS(":443", "cert.pem", "key.pem"))
}
